import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Grid,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  Smartphone as PhoneIcon,
  BatteryChargingFull as BatteryIcon,
  Security as SecurityIcon,
  LocalShipping as ShippingIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as DateIcon,
  CheckCircleOutline as CheckIcon,
  Info as OverviewIcon,
  Group as AssignmentIcon,
  History as TimelineIcon,
  Build as RepairIcon,
  ReceiptLong as SalesIcon,
  Bolt as SickwIcon,
  NoteAlt as NoteIcon,
  CheckCircle as ActiveCheckIcon,
  ContentCopy as CopyIcon,
  Check as CheckmarkIcon,
  Palette as ColorIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  SimCard as SimCardIcon,
  QrCode2 as ModelCodeIcon,
  Tag as TagIcon,
  Cancel as CancelIcon,
  RestartAlt as ResetIcon,
  AccountBalanceWallet as BalanceIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { formatNumber, formatDate } from '../utils/formatters';
import { deviceApi, userApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';
import AddRepairDialog from './AddRepairDialog';
import DevicePhotoGallery from '../components/devices/DevicePhotoGallery';

const STATUS_CHOICES = [
  { value: 'WAITING_SHIPMENT', label: 'Waiting Shipment' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'PENDING_SALE', label: 'Pending Sale' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'LOST', label: 'Lost' }
];

export default function DeviceDetailDrawer({
  open,
  onClose,
  device,
  onDeviceUpdated,
  onEditRequested,
  onDeviceDeleted,
  onMarkSoldRequested
}) {
  const { enqueueSnackbar } = useSnackbar();
  const { isAdmin, user: authUser } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [activeDevice, setActiveDevice] = useState(device);

  useEffect(() => {
    setActiveDevice(device);
  }, [device]);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [status, setStatus] = useState('');
  const [owner, setOwner] = useState('');
  const [receivedDateBd, setReceivedDateBd] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingOwner, setSavingOwner] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [fetchingSickwService, setFetchingSickwService] = useState(null); // '92' | '12' | '103' | null
  const [copiedReportId, setCopiedReportId] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [sickwBalance, setSickwBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resettingSickw, setResettingSickw] = useState(false);

  const loadSickwBalance = async () => {
    try {
      setLoadingBalance(true);
      const res = await deviceApi.getSickwBalance();
      if (res.data?.balance !== undefined) {
        setSickwBalance(res.data.balance);
      }
    } catch (err) {
      console.error('Failed to load Sickw balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleResetSickw = async () => {
    if (!device?.id || resettingSickw) return;
    try {
      setResettingSickw(true);
      const res = await deviceApi.resetSickw(device.id);
      enqueueSnackbar(res.data?.message || 'Sickw diagnostic reports reset successfully', { variant: 'success' });
      setResetConfirmOpen(false);
      if (res.data?.device && onDeviceUpdated) {
        onDeviceUpdated(res.data.device);
      }
      loadSickwBalance();
    } catch (err) {
      console.error('Failed to reset Sickw data:', err);
      enqueueSnackbar(err.response?.data?.error || err.response?.data?.detail || 'Failed to reset Sickw reports', { variant: 'error' });
    } finally {
      setResettingSickw(false);
    }
  };

  const handleFetchSickw = async (serviceId) => {
    if (!device?.id || fetchingSickwService) return;
    try {
      setFetchingSickwService(serviceId);
      const res = await deviceApi.fetchSickw(device.id, serviceId);
      enqueueSnackbar(res.data?.detail || `Sickw service ${serviceId} report retrieved successfully!`, { variant: 'success' });
      if (res.data?.device && onDeviceUpdated) {
        onDeviceUpdated(res.data.device);
      }
      loadSickwBalance();
    } catch (err) {
      console.error('Sickw fetch error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to fetch Sickw report. Please check API key, balance, or IMEI.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
    } finally {
      setFetchingSickwService(null);
    }
  };

  const handleCopyRaw = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedReportId(id);
    enqueueSnackbar('Raw payload copied to clipboard', { variant: 'info', autoHideDuration: 2000 });
    setTimeout(() => {
      setCopiedReportId(null);
    }, 2000);
  };

  const handleCopyField = (text, fieldName) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    enqueueSnackbar(`${fieldName} copied!`, { variant: 'info', autoHideDuration: 1500 });
    setTimeout(() => setCopiedField(null), 1500);
  };

  useEffect(() => {
    if (open && device) {
      setStatus(device.current_status || 'WAITING_SHIPMENT');
      setOwner(typeof device.current_owner === 'object' ? (device.current_owner?.id || '') : (device.current_owner || ''));
      setReceivedDateBd(device.received_date_bd || '');
      setSellingPrice(device.selling_price ? String(device.selling_price) : '');
      if (isAdmin) {
        fetchUsers();
      }
    }
  }, [open, device, isAdmin]);

  useEffect(() => {
    const reports = device?.sickw_reports || [];
    const has103 = reports.some((r) => String(r.service_id) === '103') || Boolean(device?.sim_lock_status);
    const canView = isAdmin || has103;
    if (open && !canView && currentTab === 5) {
      setCurrentTab(0);
    }
  }, [open, isAdmin, device, currentTab]);

  useEffect(() => {
    if (open && isAdmin && currentTab === 5 && sickwBalance === null && !loadingBalance) {
      loadSickwBalance();
    }
  }, [open, isAdmin, currentTab]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await userApi.getAll();
      setUsers(res.data.results || res.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  if (!device) return null;

  const handleStatusChange = async () => {
    if (status === device.current_status && (!sellingPrice || sellingPrice === String(device.selling_price || ''))) {
      return;
    }
    if (status === 'UNDER_REPAIR') {
      setRepairDialogOpen(true);
      return;
    }
    try {
      setSavingStatus(true);
      const payload = { current_status: status };
      if (status === 'SOLD' && sellingPrice) {
        payload.selling_price = parseFloat(sellingPrice);
      }
      const res = await deviceApi.update(device.id, payload);
      enqueueSnackbar(`Status updated to ${res.data.status_display || status}`, { variant: 'success' });
      onDeviceUpdated(res.data);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.detail || 'Failed to update status', { variant: 'error' });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleRepairCreated = async () => {
    try {
      const res = await deviceApi.getById(device.id);
      setStatus('UNDER_REPAIR');
      onDeviceUpdated(res.data);
    } catch (err) {
      // Fallback
      setStatus('UNDER_REPAIR');
      onDeviceUpdated({ ...device, current_status: 'UNDER_REPAIR' });
    }
  };

  const handleOwnerChange = async () => {
    if (owner === (device.current_owner || '')) return;
    try {
      setSavingOwner(true);
      const payload = { current_owner: owner || null };
      const res = await deviceApi.update(device.id, payload);
      enqueueSnackbar('Owner updated successfully', { variant: 'success' });
      onDeviceUpdated(res.data);
    } catch (err) {
      enqueueSnackbar('Failed to update owner', { variant: 'error' });
    } finally {
      setSavingOwner(false);
    }
  };

  const handleReceivedDateBdUpdate = async (newDate) => {
    try {
      const res = await deviceApi.update(device.id, { received_date_bd: newDate || null });
      setReceivedDateBd(newDate);
      enqueueSnackbar('BD Received Date updated', { variant: 'success' });
      onDeviceUpdated(res.data);
    } catch (err) {
      enqueueSnackbar('Failed to update BD date', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deviceApi.delete(device.id);
      enqueueSnackbar('Device deleted successfully', { variant: 'success' });
      setDeleteConfirmOpen(false);
      onClose();
      if (onDeviceDeleted) onDeviceDeleted(device.id);
    } catch (err) {
      enqueueSnackbar('Failed to delete device', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const buyingCostFormatted = device.buying_price !== null && device.buying_price !== undefined
    ? formatNumber(device.buying_price)
    : '—';

  const sellingPriceFormatted = device.selling_price !== null && device.selling_price !== undefined
    ? formatNumber(device.selling_price)
    : '—';

  const assignments = device?.assignments || [];
  const history = device?.history || [];
  const repairs = device?.repairs || [];
  const sales = device?.sales || [];
  const sickwReports = device?.sickw_reports || [];
  const notes = device?.device_notes || [];

  const hasRun103 = sickwReports.some((r) => String(r.service_id) === '103') || Boolean(device?.sim_lock_status);
  const canViewSickwTab = isAdmin || hasRun103;

  const keySimLock = device?.sim_lock_status || (sickwReports.find(r => r.sim_lock_status || r.locked_carrier)?.sim_lock_status) || (sickwReports.find(r => r.sim_lock_status || r.locked_carrier)?.locked_carrier) || '';
  const isSimUnlocked = String(keySimLock).toLowerCase().includes('unlocked');
  const isSimLocked = String(keySimLock).toLowerCase().includes('locked') && !isSimUnlocked;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 720, md: 860, lg: 960 },
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'background.paper',
            backgroundImage: 'none'
          }
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: { xs: 2, sm: 2.25 },
            pb: 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backdropFilter: 'blur(12px)',
            backgroundColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)'
          }}
        >
          <Box sx={{ pr: 1, minWidth: 0, flex: 1 }}>
            <Typography variant="h6" fontWeight={700} noWrap>
              {device.model}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <VariantBadge variant={device.variant} />
              <StatusBadge status={device.current_status} />
            </Stack>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {isAdmin && (
              <>
                <Tooltip title="Edit Device Specs">
                  <IconButton
                    color="primary"
                    onClick={() => {
                      onClose();
                      if (onEditRequested) onEditRequested(device);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Device">
                  <IconButton color="error" onClick={() => setDeleteConfirmOpen(true)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <IconButton onClick={onClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Tab Navigation Header (Admin or when Service 103 has been fetched for staff) */}
        {(isAdmin || hasRun103) && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 1, sm: 2 }, bgcolor: 'background.paper' }}>
            <Tabs
              value={currentTab}
              onChange={(e, val) => setCurrentTab(val)}
              variant="scrollable"
              scrollButtons={false}
              sx={{
                minHeight: 46,
                '& .MuiTabs-scrollButtons': { display: 'none' },
                '& .MuiTabs-flexContainer': {
                  gap: { xs: 0.5, sm: 0.8 },
                  flexWrap: { xs: 'nowrap', sm: 'wrap' }
                }
              }}
            >
              <Tab
                value={0}
                icon={<OverviewIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label="Overview"
                sx={{ minHeight: 46, minWidth: 0, px: 1.2, textTransform: 'none', fontWeight: 600, fontSize: '0.84rem' }}
              />
              {isAdmin && (
                <Tab
                  value={1}
                  icon={<AssignmentIcon sx={{ fontSize: 17 }} />}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      Assignments
                      {assignments.length > 0 && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.7,
                            minWidth: 18,
                            height: 18,
                            px: 0.6,
                            borderRadius: '9px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: currentTab === 1 ? 'primary.main' : 'rgba(59, 130, 246, 0.15)',
                            color: currentTab === 1 ? '#ffffff' : 'primary.main',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            lineHeight: 1
                          }}
                        >
                          {assignments.length}
                        </Box>
                      )}
                    </Box>
                  }
                  sx={{ minHeight: 46, minWidth: 0, px: 1.2, textTransform: 'none', fontWeight: 600, fontSize: '0.84rem' }}
                />
              )}
              <Tab
                value={2}
                icon={<TimelineIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label={
                  <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    Timeline
                    {history.length > 0 && (
                      <Box
                        component="span"
                        sx={{
                          ml: 0.7,
                          minWidth: 18,
                          height: 18,
                          px: 0.6,
                          borderRadius: '9px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: currentTab === 2 ? '#8B5CF6' : 'rgba(139, 92, 246, 0.15)',
                          color: currentTab === 2 ? '#ffffff' : '#8B5CF6',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          lineHeight: 1
                        }}
                      >
                        {history.length}
                      </Box>
                    )}
                  </Box>
                }
                sx={{ minHeight: 46, minWidth: 0, px: 1.2, textTransform: 'none', fontWeight: 600, fontSize: '0.84rem' }}
              />
              {isAdmin && (
                <Tab
                  value={3}
                  icon={<RepairIcon sx={{ fontSize: 17 }} />}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      Repairs
                      {repairs.length > 0 && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.7,
                            minWidth: 18,
                            height: 18,
                            px: 0.6,
                            borderRadius: '9px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: currentTab === 3 ? '#F59E0B' : 'rgba(245, 158, 11, 0.15)',
                            color: currentTab === 3 ? '#ffffff' : '#D97706',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            lineHeight: 1
                          }}
                        >
                          {repairs.length}
                        </Box>
                      )}
                    </Box>
                  }
                  sx={{ minHeight: 46, minWidth: 0, px: 1.2, textTransform: 'none', fontWeight: 600, fontSize: '0.84rem' }}
                />
              )}
              {isAdmin && (
                <Tab
                  value={4}
                  icon={<SalesIcon sx={{ fontSize: 17 }} />}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      Sales
                      {sales.length > 0 && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.7,
                            minWidth: 18,
                            height: 18,
                            px: 0.6,
                            borderRadius: '9px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: currentTab === 4 ? '#10B981' : 'rgba(16, 185, 129, 0.15)',
                            color: currentTab === 4 ? '#ffffff' : '#10B981',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            lineHeight: 1
                          }}
                        >
                          {sales.length}
                        </Box>
                      )}
                    </Box>
                  }
                  sx={{ minHeight: 46, minWidth: 0, px: 1.2, textTransform: 'none', fontWeight: 600, fontSize: '0.84rem' }}
                />
              )}
              {canViewSickwTab && (
                <Tab
                  value={5}
                  icon={<SickwIcon sx={{ fontSize: 17 }} />}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      Sickw Report
                      {hasRun103 && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.7,
                            minWidth: 18,
                            height: 18,
                            px: 0.6,
                            borderRadius: '9px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isSimUnlocked ? '#10B981' : '#F59E0B',
                            color: '#ffffff',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            lineHeight: 1
                          }}
                        >
                          {isSimUnlocked ? 'Unlocked' : '103'}
                        </Box>
                      )}
                    </Box>
                  }
                  sx={{ minHeight: 46, minWidth: 0, px: 1.2, textTransform: 'none', fontWeight: 600, fontSize: '0.84rem' }}
                />
              )}
              <Tab
                value={6}
                icon={<NoteIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label="Notes"
                sx={{ minHeight: 46, minWidth: 0, px: 1.2, textTransform: 'none', fontWeight: 600, fontSize: '0.84rem' }}
              />
            </Tabs>
          </Box>
        )}

        {/* Tab Content Panes */}
        <Box sx={{ p: { xs: 1.5, sm: 2 }, flex: 1, overflowY: 'auto' }}>

          {/* TAB 0: OVERVIEW */}
          {currentTab === 0 && (
            <Stack spacing={1.5}>
              {/* Quick Management Actions (Admin Only) */}
              {isAdmin ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC'
                  }}
                >
                  <Typography variant="caption" color="primary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 1 }}>
                    Quick Status & Assignment
                  </Typography>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} sm={status === 'SOLD' ? 3.5 : 4.5}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={status}
                          label="Status"
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            setStatus(newStatus);
                            if (newStatus === 'UNDER_REPAIR') {
                              setRepairDialogOpen(true);
                            }
                          }}
                        >
                          {STATUS_CHOICES.map((c) => (
                            <MenuItem key={c.value} value={c.value}>
                              {c.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    {status === 'SOLD' && (
                      <Grid item xs={12} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Selling Price (BDT)"
                          value={sellingPrice}
                          onChange={(e) => setSellingPrice(e.target.value)}
                          placeholder="Enter price"
                        />
                      </Grid>
                    )}

                    <Grid item xs={12} sm={status === 'SOLD' ? 2 : 2.5}>
                      <Button
                        fullWidth
                        variant="contained"
                        disabled={savingStatus || (status === device.current_status && (!sellingPrice || sellingPrice === String(device.selling_price || '')))}
                        onClick={handleStatusChange}
                        startIcon={savingStatus ? <CircularProgress size={15} color="inherit" /> : <CheckIcon sx={{ color: '#ffffff !important', fontSize: 18 }} />}
                        sx={{
                          height: 40,
                          color: '#ffffff !important',
                          fontWeight: 600,
                          fontSize: '0.82rem',
                          textTransform: 'none',
                          '&.Mui-disabled': {
                            color: 'rgba(255, 255, 255, 0.7) !important',
                            bgcolor: 'primary.main',
                            opacity: 0.65
                          }
                        }}
                      >
                        Update
                      </Button>
                    </Grid>

                    <Grid item xs={12} sm={status === 'SOLD' ? 2.3 : 3.5}>
                      <FormControl fullWidth size="small" disabled={loadingUsers}>
                        <InputLabel>Assigned To</InputLabel>
                        <Select
                          value={owner}
                          label="Assigned To"
                          onChange={(e) => setOwner(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>None (Unassigned)</em>
                          </MenuItem>
                          {users
                            .filter((u) => u.username?.toLowerCase() !== 'admin')
                            .map((u) => {
                              const roleDisplay = u.username?.toLowerCase() === 'jubaer' || u.role === 'ADMIN' ? 'Admin' : 'Employee';
                              return (
                                <MenuItem key={u.id} value={u.id}>
                                  {u.username} ({roleDisplay})
                                </MenuItem>
                              );
                            })}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={status === 'SOLD' ? 1.2 : 1.5}>
                      <Button
                        fullWidth
                        variant="outlined"
                        disabled={savingOwner || owner === (device.current_owner || '')}
                        onClick={handleOwnerChange}
                        startIcon={savingOwner ? <CircularProgress size={15} color="inherit" /> : <PersonIcon sx={{ fontSize: 18 }} />}
                        sx={{ height: 40, fontWeight: 600, fontSize: '0.82rem', textTransform: 'none' }}
                      >
                        Assign
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              ) : (
                /* Employee Custody Overview Card */
                <Paper
                  variant="outlined"
                  sx={{
                    p: { xs: 1.75, sm: 2 },
                    borderRadius: 2.5,
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="caption" color="primary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Custody & Assignment
                    </Typography>
                    <StatusBadge status={device.current_status} />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: { xs: 'stretch', sm: 'center' },
                      justifyContent: 'space-between',
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 2
                    }}
                  >
                    <Grid container spacing={2} sx={{ flex: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Assigned To</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {device.current_owner_name || authUser?.username || 'You'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Assigned Date</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {formatDate(device.assigned_date || device.received_date_bd || device.created_at)}
                        </Typography>
                      </Grid>
                    </Grid>

                    {device.current_status === 'IN_STOCK' && (
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<SalesIcon sx={{ fontSize: '18px !important' }} />}
                        onClick={() => {
                          onClose();
                          if (onMarkSoldRequested) onMarkSoldRequested(device);
                        }}
                        sx={{
                          width: { xs: '100%', sm: 'auto' },
                          minWidth: { sm: 150 },
                          px: 2.5,
                          py: 0.85,
                          fontWeight: 700,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontSize: '0.84rem',
                          boxShadow: 'none',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        Mark as Sold
                      </Button>
                    )}
                  </Box>

                  {device.current_status === 'PENDING_SALE' && (
                    <Alert severity="warning" sx={{ mt: 1.5, py: 0.5, borderRadius: 2 }}>
                      <strong>Pending Sale Approval:</strong> A sale request for this device is awaiting Admin pricing review and confirmation.
                    </Alert>
                  )}

                  {/* If Service 103 has been fetched, employee can see verified Carrier & SIM Lock status */}
                  {hasRun103 && (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        mt: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.04)',
                        borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        {isSimUnlocked ? (
                          <LockOpenIcon color="success" sx={{ fontSize: 22 }} />
                        ) : isSimLocked ? (
                          <LockIcon color="error" sx={{ fontSize: 22 }} />
                        ) : (
                          <SimCardIcon color="primary" sx={{ fontSize: 22 }} />
                        )}
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                            Carrier & SIM Lock Status (Verified by Admin)
                          </Typography>
                          <Typography variant="body2" fontWeight={700} color={isSimUnlocked ? 'success.main' : (isSimLocked ? 'error.main' : 'text.primary')}>
                            {keySimLock || (isSimUnlocked ? 'Factory Unlocked' : 'Carrier Locked')}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setCurrentTab(5)}
                        startIcon={<SickwIcon fontSize="small" />}
                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5 }}
                      >
                        View Report
                      </Button>
                    </Paper>
                  )}
                </Paper>
              )}

              {/* Device Physical Condition Photos */}
              <DevicePhotoGallery
                device={activeDevice || device}
                isAdmin={isAdmin}
                onPhotosUpdated={(updatedDev) => {
                  setActiveDevice(updatedDev);
                  if (onDeviceUpdated) onDeviceUpdated(updatedDev);
                }}
              />

              {/* Side-by-Side Main Info (Hardware Specs on Left, Pricing & Logistics on Right) */}
              <Grid container spacing={1.5}>
                {/* Left Column: Hardware Specs */}
                <Grid item xs={12} md={isAdmin ? 6 : 12}>
                  <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                      <PhoneIcon color="action" sx={{ fontSize: 18 }} />
                      <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary' }}>
                        Hardware Specs & Identifiers
                      </Typography>
                    </Box>
                    <Grid container spacing={1.25} sx={{ flex: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">IMEI</Typography>
                        <Box sx={{ mt: 0.2 }}>
                          <CopyableText text={device.imei} />
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">Serial Number</Typography>
                        <Box sx={{ mt: 0.2 }}>
                          <CopyableText text={device.serial_number} />
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Capacity</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.2 }}>{device.capacity || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Color</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.2 }}>{device.color || '—'}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Battery Health</Typography>
                        <Typography variant="body2" fontWeight={700} color={device.battery_health ? 'success.main' : 'text.primary'} sx={{ mt: 0.2 }}>
                          {device.battery_health ? `${device.battery_health}%` : '—'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Cycle Count</Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.2 }}>
                          {device.battery_cycle ? `${device.battery_cycle} cycles` : '—'}
                        </Typography>
                      </Grid>
                      {hasRun103 && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">SIM Lock Status</Typography>
                          <Typography variant="body2" fontWeight={700} color={isSimUnlocked ? 'success.main' : (isSimLocked ? 'error.main' : 'text.primary')} sx={{ mt: 0.2 }}>
                            {isSimUnlocked ? 'Unlocked' : (isSimLocked ? 'Locked' : (keySimLock || 'Checked'))}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Right Column: Financial & Pricing & Logistics (Admin Only) */}
                {isAdmin && (
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MoneyIcon color="action" sx={{ fontSize: 18 }} />
                          <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary' }}>
                            Selling Info & Logistics
                          </Typography>
                        </Box>
                      </Box>

                      {/* Pricing Highlights Ribbon */}
                      <Box
                        sx={{
                          p: 1.25,
                          mb: 1.25,
                          borderRadius: 1.5,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)',
                          border: '1px solid',
                          borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.2)'
                        }}
                      >
                        <Grid container spacing={1} alignItems="center">
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Selling Price</Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="success.main" sx={{ lineHeight: 1.2 }}>
                              {sellingPriceFormatted !== '—' ? `${sellingPriceFormatted} BDT` : '—'}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>Buying Cost</Typography>
                            <Typography variant="subtitle1" fontWeight={800} color="primary.main" sx={{ lineHeight: 1.2 }}>
                              {buyingCostFormatted !== '—' ? `${buyingCostFormatted} BDT` : '—'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* Logistics Grid */}
                      <Grid container spacing={1.25} sx={{ flex: 1 }}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Supplier</Typography>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ mt: 0.2 }}>{device.shipment_supplier || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Shipping Agent</Typography>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ mt: 0.2 }}>{device.shipment_agent || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Received (CN)</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ mt: 0.2 }}>{device.shipment_receive_date_cn ? formatDate(device.shipment_receive_date_cn) : '—'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Received (BD)</Typography>
                          <TextField
                            type="date"
                            size="small"
                            value={receivedDateBd}
                            onChange={(e) => handleReceivedDateBdUpdate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={{
                              mt: 0.2,
                              width: '100%',
                              '& .MuiOutlinedInput-root': {
                                height: 28,
                                borderRadius: 1.2,
                                fontSize: '0.78rem'
                              },
                              '& .MuiInputBase-input': {
                                py: 0.2,
                                px: 0.8
                              }
                            }}
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                )}
              </Grid>

              {/* Notes & Remarks Card (Directly on Overview Page) */}
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.3)' : 'rgba(241, 245, 249, 0.6)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NoteIcon color="action" sx={{ fontSize: 18 }} />
                    <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.secondary' }}>
                      Notes & Remarks
                    </Typography>
                    {(device.notes || notes.length > 0 || device.b2b_issue_notes) && (
                      <Chip
                        size="small"
                        label={`${(device.notes ? 1 : 0) + notes.length + (device.b2b_issue_notes ? 1 : 0)} notes`}
                        sx={{ height: 18, fontSize: '0.7rem', fontWeight: 600, bgcolor: 'rgba(59, 130, 246, 0.1)', color: 'primary.main' }}
                      />
                    )}
                  </Box>
                  {isAdmin && (
                    <Button
                      size="small"
                      onClick={() => setCurrentTab(6)}
                      sx={{ fontSize: '0.75rem', py: 0.2, px: 1, minHeight: 0, textTransform: 'none' }}
                    >
                      Manage Notes
                    </Button>
                  )}
                </Box>

                {!(device.notes || notes.length > 0 || device.b2b_issue_notes) ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.82rem', py: 0.5 }}>
                    No internal notes or remarks recorded for this unit.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {device.notes && (
                      <Box
                        sx={{
                          p: 1.2,
                          borderRadius: 1.5,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} color="primary" sx={{ display: 'block', mb: 0.3 }}>
                          General Remarks
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                          {device.notes}
                        </Typography>
                      </Box>
                    )}

                    {device.b2b_issue_notes && (
                      <Box
                        sx={{
                          p: 1.2,
                          borderRadius: 1.5,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                          border: '1px solid',
                          borderColor: 'warning.light'
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} color="warning.main" sx={{ display: 'block', mb: 0.3 }}>
                          B2B Remarks
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                          {device.b2b_issue_notes}
                        </Typography>
                      </Box>
                    )}

                    {notes.slice(0, 3).map((n) => (
                      <Box
                        key={n.id}
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#ffffff',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.2 }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary">
                            {n.author_name || 'Admin'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                            {n.created_at ? formatDate(n.created_at) : '—'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{n.content}</Typography>
                      </Box>
                    ))}
                    {notes.length > 3 && (
                      <Button
                        size="small"
                        onClick={() => setCurrentTab(6)}
                        sx={{ fontSize: '0.75rem', py: 0.2, textTransform: 'none', alignSelf: 'flex-start' }}
                      >
                        + View all {notes.length} notes in Notes Tab
                      </Button>
                    )}
                  </Stack>
                )}
              </Paper>
            </Stack>
          )}

          {/* TAB 1: ASSIGNMENT HISTORY */}
          {currentTab === 1 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Device Assignment History
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Complete audit trail of employee possession, handovers, and return dates
              </Typography>

              {assignments.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography color="text.secondary">
                    No assignment records logged for this device yet.
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Assigned Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Returned Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assignments.map((a) => (
                        <TableRow key={a.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {a.employee_username}
                            </Typography>
                            {a.employee_name && (
                              <Typography variant="caption" color="text.secondary">
                                {a.employee_name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {a.assigned_date ? formatDate(a.assigned_date) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {a.returned_date ? formatDate(a.returned_date) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {a.is_active ? (
                              <Chip
                                size="small"
                                label="Active"
                                variant="filled"
                                sx={{
                                  fontWeight: 700,
                                  bgcolor: '#10B981',
                                  color: '#ffffff !important',
                                  '& .MuiChip-label': { color: '#ffffff !important' }
                                }}
                              />
                            ) : (
                              <Chip size="small" label="Returned" color="default" variant="outlined" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {a.notes || '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* TAB 2: ACTIVITY TIMELINE */}
          {currentTab === 2 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Activity & Audit Timeline
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Chronological log of all system status updates, edits, and assignments
              </Typography>

              {history.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography color="text.secondary">
                    No activity timeline records available for this unit.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {history.map((h, idx) => (
                    <Paper key={h.id || idx} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Chip
                          size="small"
                          label={h.action_type || 'UPDATE'}
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {h.created_at ? new Date(h.created_at).toLocaleString() : '—'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>
                        {h.new_state || 'Updated'}
                      </Typography>
                      {h.old_state && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          Previous: {h.old_state}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        By: <strong>{h.user_name || 'System'}</strong>
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* TAB 3: REPAIR HISTORY */}
          {currentTab === 3 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Device Repair Records
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Service history, hardware replacement logs, and workshop costs
              </Typography>

              {repairs.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography color="text.secondary">
                    No repair logs on file for this device.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {repairs.map((r) => (
                    <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {r.repair_center || 'Service Lab'}
                        </Typography>
                        <Chip size="small" label={r.status_display || r.status} color="warning" sx={{ fontWeight: 700 }} />
                      </Box>
                      <Typography variant="body2" color="text.primary">
                        {r.issue_description}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Sent Date</Typography>
                          <Typography variant="body2">{r.sent_date ? formatDate(r.sent_date) : '—'}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Return Date</Typography>
                          <Typography variant="body2">{r.returned_date ? formatDate(r.returned_date) : '—'}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Repair Cost</Typography>
                          <Typography variant="body2" fontWeight={700} color="error.main">
                            {r.repair_cost ? `${formatNumber(r.repair_cost)} BDT` : '0 BDT'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* TAB 4: SALES HISTORY */}
          {currentTab === 4 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Sales & Invoice Records
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Customer invoice details, seller attribution, and profit breakdown
              </Typography>

              {sales.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography color="text.secondary">
                    This unit has not been sold yet (or no sale record attached).
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {sales.map((s) => (
                    <Paper key={s.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} color="primary">
                          Invoice #{s.invoice_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.sale_date ? formatDate(s.sale_date) : '—'}
                        </Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Customer</Typography>
                          <Typography variant="body2" fontWeight={600}>{s.customer_name || 'Walk-in Customer'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Sold By</Typography>
                          <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                            {s.seller_name || '—'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Selling Price</Typography>
                          <Typography variant="body2" fontWeight={700} color="success.main">
                            {formatNumber(s.selling_price)} BDT
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Realized Profit</Typography>
                          <Typography variant="body2" fontWeight={700} color="info.main">
                            {s.profit ? `${formatNumber(s.profit)} BDT` : '—'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* TAB 5: SICKW REPORT */}
          {currentTab === 5 && canViewSickwTab && (() => {
            // Check completed services from reports
            const hasRun92 = sickwReports.some((r) => String(r.service_id) === '92');
            const hasRun12 = sickwReports.some((r) => String(r.service_id) === '12');
            const hasRun103 = sickwReports.some((r) => String(r.service_id) === '103') || Boolean(device?.sim_lock_status);

            // Button disable rules:
            // 1. If 103 is performed, both 103 & 92 are unclickable. Only 12 remains clickable.
            // 2. If 12 is performed, 12 & 92 are unclickable (12 already provides color).
            // 3. If 92 is performed, 92 is unclickable.
            const is92Disabled = hasRun92 || hasRun12 || hasRun103 || !!fetchingSickwService;
            const is12Disabled = hasRun12 || !!fetchingSickwService;
            const is103Disabled = hasRun103 || !!fetchingSickwService;

            // Normalizes color to base keyword (e.g. "Natural Titanium" -> "natural", "NATURL TTNM" -> "natural", "Sierra Blue" -> "blue")
            const normalizeBaseColor = (colorStr) => {
              if (!colorStr) return null;
              let s = String(colorStr).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
              // Strip finish keywords like titanium/ttnm so comparison focuses strictly on color
              s = s.replace(/\b(titanium|ttnm)\b/g, ' ').replace(/\s+/g, ' ').trim();

              if (/\b(rose\s*gold)\b/.test(s)) return 'rose gold';
              if (/\b(natural|naturl|natrl|nat)\b/.test(s)) return 'natural';
              if (/\b(desert|dsrt)\b/.test(s)) return 'desert';
              if (/\b(blue|blu)\b/.test(s)) return 'blue';
              if (/\b(black|blk|midnight|dark)\b/.test(s)) return 'black';
              if (/\b(white|wht|starlight)\b/.test(s)) return 'white';
              if (/\b(gold|gld)\b/.test(s)) return 'gold';
              if (/\b(silver|slv)\b/.test(s)) return 'silver';
              if (/\b(purple|violet|lavender)\b/.test(s)) return 'purple';
              if (/\b(green|grn|alpine|mint)\b/.test(s)) return 'green';
              if (/\b(red|product\s*red)\b/.test(s)) return 'red';
              if (/\b(pink|rose)\b/.test(s)) return 'pink';
              if (/\b(yellow|ylw)\b/.test(s)) return 'yellow';
              if (/\b(orange|coral)\b/.test(s)) return 'orange';
              if (/\b(gray|grey|gry)\b/.test(s)) return 'gray';
              return s.split(/\s+/)[0] || null;
            };

            // Extracts true motherboard color from Sickw reports by parsing raw API payloads
            const extractSickwColorFromText = (rawText) => {
              if (!rawText) return null;
              const str = String(rawText);

              // 1. Explicit line "Color: <val>"
              const colorLineMatch = str.match(/Color:\s*([^\r\n,]+)/i);
              if (colorLineMatch && colorLineMatch[1].trim()) {
                const candidate = colorLineMatch[1].trim();
                if (!candidate.toLowerCase().includes('apple')) return candidate;
              }

              // 2. Hyphen pattern (e.g. "Apple - iPhone 15 Pro Max 256GB - Apple Intelligence - Blue Titanium (Unlocked)")
              const hyphenMatch = str.match(/-\s*([A-Za-z\s]+?(?:Titanium|Gold|Silver|Black|White|Blue|Purple|Green|Red|Yellow|Pink|Gray|Grey))\b/i);
              if (hyphenMatch && hyphenMatch[1].trim()) {
                return hyphenMatch[1].trim();
              }

              // 3. Comma pattern (e.g. "...,256GB,BLUE TTNM" or "...,256GB,NATURL TTNM")
              const commaMatch = str.match(/\b\d+\s*(?:GB|TB)\s*,\s*([A-Za-z0-9\s]+?)(?:,|$|\r|\n)/i);
              if (commaMatch && commaMatch[1].trim()) {
                return commaMatch[1].trim();
              }

              // 4. Known Apple colors / shorthand anywhere in raw text (including NATURL TTNM)
              const knownColorRegex = /\b(Blue\s*Titanium|Natural\s*Titanium|Black\s*Titanium|White\s*Titanium|Desert\s*Titanium|Sierra\s*Blue|Pacific\s*Blue|Sky\s*Blue|Midnight\s*Blue|Deep\s*Purple|Alpine\s*Green|Midnight\s*Green|Space\s*Black|Space\s*Gray|Space\s*Grey|Rose\s*Gold|Product\s*Red|Starlight|Midnight|BLUE\s*TTNM|NATURAL\s*TTNM|NATURL\s*TTNM|NATRL\s*TTNM|NAT\s*TTNM|BLACK\s*TTNM|WHITE\s*TTNM|DESERT\s*TTNM)\b/i;
              const knownMatch = str.match(knownColorRegex);
              if (knownMatch && knownMatch[1].trim()) {
                return knownMatch[1].trim();
              }

              return null;
            };

            const getSickwMotherboardColor = () => {
              for (const r of sickwReports) {
                // Ground truth 1: parse directly from the raw_text received from Sickw
                const fromRaw = extractSickwColorFromText(r.raw_text);
                if (fromRaw) return fromRaw;

                // Ground truth 2: parse from model_description
                const fromDesc = extractSickwColorFromText(r.model_description);
                if (fromDesc) return fromDesc;

                // Ground truth 3: check parsed_data or r.color ONLY if it matches actual color keyword
                const fromColor = extractSickwColorFromText(r.color || r.parsed_data?.color);
                if (fromColor) return fromColor;
              }
              return null;
            };

            const manualOutlookColor = device.color || '';
            const sickwMotherboardColor = getSickwMotherboardColor();
            const baseManual = normalizeBaseColor(manualOutlookColor);
            const baseSickw = normalizeBaseColor(sickwMotherboardColor);

            const hasColorChecked = Boolean(manualOutlookColor && sickwMotherboardColor && baseManual && baseSickw);
            const isColorMatch = hasColorChecked ? baseManual === baseSickw : null;

            // Model number: ONLY Apple A-number (e.g. A2218, A2849) fetched from Service 12 or Service 103, otherwise '-'
            const getAppleModelCode = () => {
              // Priority 1: Check Service 12 first
              const srv12 = sickwReports.find((r) => String(r.service_id) === '12');
              if (srv12) {
                const candidates = [
                  srv12.model_code,
                  srv12.parsed_data?.model_code,
                  srv12.parsed_data?.model_number,
                  srv12.raw_text,
                  srv12.model
                ];
                for (const c of candidates) {
                  if (c) {
                    const match = String(c).match(/\b(A\d{4})\b/i);
                    if (match) return match[1].toUpperCase();
                  }
                }
              }

              // Priority 2: Check any other Sickw report (e.g. Service 103 which also returns Model: ... A2849)
              for (const r of sickwReports) {
                const candidates = [
                  r.model_code,
                  r.parsed_data?.model_code,
                  r.parsed_data?.model_number,
                  r.raw_text,
                  r.model
                ];
                for (const c of candidates) {
                  if (c) {
                    const match = String(c).match(/\b(A\d{4})\b/i);
                    if (match) return match[1].toUpperCase();
                  }
                }
              }

              return '—';
            };

            const keyModelCode = getAppleModelCode();

            // Highlight other key information extracted from reports or device
            const findValue = (field, parsedKeys = []) => {
              for (const r of sickwReports) {
                if (r[field]) return r[field];
                if (r.parsed_data) {
                  for (const k of parsedKeys) {
                    if (r.parsed_data[k]) return r.parsed_data[k];
                  }
                }
              }
              return device[field] || '—';
            };

            const keySerial = findValue('serial_number', ['serial_number', 'serial']);
            const keyPurchaseDate = findValue('estimated_purchase_date', ['estimated_purchase_date', 'purchase_date']);
            const keySimLock = findValue('sim_lock_status', ['sim_lock_status', 'locked_carrier']);

            const isSimUnlocked = String(keySimLock).toLowerCase().includes('unlocked');
            const isSimLocked = String(keySimLock).toLowerCase().includes('locked') && !isSimUnlocked;

            return (
              <Box>
                {/* Section Header */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1, mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Sickw Diagnostic Reports
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Live GSX Apple specifications, warranty, serial & carrier lock lookup
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    {/* Live Balance Chip (Admin only) */}
                    {isAdmin && (
                      <>
                        <Tooltip title="Sickw Account Balance (Click to refresh)">
                          <Chip
                            icon={loadingBalance ? <CircularProgress size={13} color="inherit" /> : <BalanceIcon fontSize="small" sx={{ color: '#10b981 !important' }} />}
                            label={sickwBalance !== null ? `Balance: $${sickwBalance} USD` : (loadingBalance ? 'Checking...' : 'Check Balance')}
                            variant="outlined"
                            size="small"
                            onClick={loadSickwBalance}
                            sx={{
                              fontWeight: 700,
                              cursor: 'pointer',
                              borderColor: '#10b981',
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
                              color: (theme) => theme.palette.mode === 'dark' ? '#34d399' : '#059669',
                              '&:hover': {
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.22)' : 'rgba(16, 185, 129, 0.16)'
                              }
                            }}
                          />
                        </Tooltip>

                        {/* Reset Icon Button */}
                        <Tooltip title={sickwReports.length === 0 ? "No fetch data to reset" : "Reset all Sickw fetch reports & specs for this device"}>
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              disabled={resettingSickw || sickwReports.length === 0}
                              onClick={() => setResetConfirmOpen(true)}
                              sx={{
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1.5,
                                p: 0.6,
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.06)',
                                '&:hover': {
                                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.14)'
                                }
                              }}
                            >
                              {resettingSickw ? <CircularProgress size={16} color="inherit" /> : <ResetIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}

                    {/* IMEI Chip */}
                    <Chip
                      icon={<SickwIcon fontSize="small" sx={{ color: '#f59e0b !important' }} />}
                      label={`IMEI: ${device.imei}`}
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                    />
                  </Stack>
                </Box>

                {/* 3 FETCH SERVICE BUTTONS (Admin only) */}
                {isAdmin ? (
                  <Paper
                    variant="outlined"
                  sx={{
                    p: 2,
                    mb: 3,
                    borderRadius: 2,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.8)',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1.5 }}>
                    Fetch Live Data From Sickw API
                  </Typography>

                  <Grid container spacing={1.5}>
                    {/* Service 92 */}
                    <Grid item xs={12} sm={4}>
                      {(() => {
                        const is92Covered = !hasRun92 && (hasRun103 || hasRun12);
                        return (
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              borderRadius: 2,
                              borderColor: hasRun92 || is92Covered ? 'action.disabledBackground' : 'primary.light',
                              backgroundColor: (theme) => (hasRun92 || is92Covered)
                                ? (theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(241, 245, 249, 0.6)')
                                : (theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff'),
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            <Box sx={{ mb: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <Chip label="Service 92" size="small" color={is92Disabled ? 'default' : 'primary'} variant={is92Disabled ? 'outlined' : 'filled'} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                                  <Chip
                                    label={hasRun92 ? "Billed: $0.022" : "$0.022 USD"}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      fontWeight: 700,
                                      color: hasRun92 ? 'success.main' : 'text.secondary',
                                      borderColor: hasRun92 ? 'success.main' : 'divider'
                                    }}
                                  />
                                </Box>
                                {hasRun92 ? (
                                  <Chip icon={<ActiveCheckIcon fontSize="small" />} label="Done" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                ) : is92Covered ? (
                                  <Chip
                                    label="Covered"
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      fontWeight: 600,
                                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : '#e2e8f0',
                                      color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569'
                                    }}
                                  />
                                ) : null}
                              </Box>
                              <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
                                Color Only
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.3, mt: 0.25 }}>
                                Returns device color only.
                              </Typography>
                            </Box>
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              disabled={is92Disabled}
                              onClick={() => handleFetchSickw('92')}
                              startIcon={
                                fetchingSickwService === '92' ? (
                                  <CircularProgress size={14} color="inherit" />
                                ) : hasRun92 ? (
                                  <ActiveCheckIcon fontSize="small" color="success" />
                                ) : is92Covered ? (
                                  <CheckIcon fontSize="small" />
                                ) : (
                                  <ColorIcon fontSize="small" />
                                )
                              }
                              sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                mt: 1,
                                '&.Mui-disabled': {
                                  color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1 !important' : '#475569 !important',
                                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
                                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'
                                }
                              }}
                            >
                              {fetchingSickwService === '92'
                                ? 'Fetching...'
                                : hasRun92
                                ? 'Color Fetched'
                                : is92Covered
                                ? `Covered (${hasRun103 ? 'Srv 103' : 'Srv 12'})`
                                : 'Fetch Srv 92'}
                            </Button>
                          </Paper>
                        );
                      })()}
                    </Grid>

                    {/* Service 12 */}
                    <Grid item xs={12} sm={4}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          borderRadius: 2,
                          borderColor: hasRun12 ? 'action.disabledBackground' : 'primary.main',
                          backgroundColor: (theme) => hasRun12
                            ? (theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(241, 245, 249, 0.6)')
                            : (theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff'),
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Chip
                                label="Service 12"
                                size="small"
                                variant={hasRun12 ? 'outlined' : 'filled'}
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  bgcolor: hasRun12
                                    ? (theme) => theme.palette.mode === 'dark' ? 'rgba(148, 163, 184, 0.15)' : '#e2e8f0'
                                    : 'primary.main',
                                  color: hasRun12
                                    ? (theme) => theme.palette.mode === 'dark' ? '#cbd5e1' : '#1e293b'
                                    : '#ffffff',
                                  borderColor: hasRun12 ? 'divider' : 'transparent'
                                }}
                              />
                              <Chip
                                label={hasRun12 ? "Billed: $0.025" : "$0.025 USD"}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: hasRun12 ? 'success.main' : 'text.secondary',
                                  borderColor: hasRun12 ? 'success.main' : 'divider'
                                }}
                              />
                            </Box>
                            {hasRun12 && (
                              <Chip icon={<ActiveCheckIcon fontSize="small" />} label="Done" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
                            Model No & Specs
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.3, mt: 0.25 }}>
                            Color, Model No (A2218), Serial, Purchase Date.
                          </Typography>
                        </Box>
                        <Button
                          variant={hasRun12 ? 'outlined' : 'contained'}
                          color="primary"
                          size="small"
                          fullWidth
                          disabled={is12Disabled}
                          onClick={() => handleFetchSickw('12')}
                          startIcon={fetchingSickwService === '12' ? <CircularProgress size={14} color="inherit" /> : (hasRun12 ? <ActiveCheckIcon fontSize="small" /> : <ModelCodeIcon fontSize="small" />)}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            mt: 1,
                            '&.Mui-disabled': {
                              color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1 !important' : '#475569 !important',
                              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
                              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'
                            }
                          }}
                        >
                          {fetchingSickwService === '12'
                            ? 'Fetching...'
                            : hasRun12
                            ? 'Specs Fetched'
                            : 'Fetch Srv 12'}
                        </Button>
                      </Paper>
                    </Grid>

                    {/* Service 103 */}
                    <Grid item xs={12} sm={4}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          borderRadius: 2,
                          borderColor: hasRun103 ? 'action.disabledBackground' : 'primary.main',
                          backgroundColor: (theme) => hasRun103
                            ? (theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(241, 245, 249, 0.6)')
                            : (theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff'),
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              <Chip label="Service 103" size="small" color={hasRun103 ? 'default' : 'primary'} sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />
                              <Chip
                                label={hasRun103 ? "Billed: $0.060" : "$0.060 USD"}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  color: hasRun103 ? 'success.main' : 'text.secondary',
                                  borderColor: hasRun103 ? 'success.main' : 'divider'
                                }}
                              />
                            </Box>
                            {hasRun103 && (
                              <Chip icon={<ActiveCheckIcon fontSize="small" />} label="Done" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 0.5 }}>
                            Carrier & SIM Lock
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.3, mt: 0.25 }}>
                            Color, Serial, Purchase Date, SIM Lock Status.
                          </Typography>
                        </Box>
                        <Button
                          variant={hasRun103 ? 'outlined' : 'contained'}
                          color="primary"
                          size="small"
                          fullWidth
                          disabled={is103Disabled}
                          onClick={() => handleFetchSickw('103')}
                          startIcon={fetchingSickwService === '103' ? <CircularProgress size={14} color="inherit" /> : (hasRun103 ? <ActiveCheckIcon fontSize="small" /> : <SimCardIcon fontSize="small" />)}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            mt: 1,
                            '&.Mui-disabled': {
                              color: (theme) => theme.palette.mode === 'dark' ? '#cbd5e1 !important' : '#475569 !important',
                              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.15)' : '#cbd5e1',
                              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9'
                            }
                          }}
                        >
                          {fetchingSickwService === '103'
                            ? 'Fetching...'
                            : hasRun103
                            ? 'Lock Status Fetched'
                            : 'Fetch Srv 103'}
                        </Button>
                      </Paper>
                    </Grid>
                  </Grid>
                  </Paper>
                ) : (
                  <Alert
                    severity="success"
                    icon={<ActiveCheckIcon fontSize="small" />}
                    sx={{ mb: 3, borderRadius: 2, fontWeight: 500 }}
                  >
                    Official Carrier & SIM Lock report (Service 103) fetched and verified by Admin.
                  </Alert>
                )}

                {/* HIGHLIGHTED KEY INFORMATION CARDS */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon fontSize="small" color="primary" /> Key Information Highlight
                  </Typography>

                  <Grid container spacing={1.5}>
                    {/* 1. COLOR (OUTLOOK VS SICKW MOTHERBOARD COLOR COMPARISON) */}
                    <Grid item xs={6} sm={4} md={2.4}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff',
                          borderColor: hasColorChecked
                            ? (isColorMatch ? 'success.main' : 'error.main')
                            : 'divider',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <ColorIcon fontSize="small" color={hasColorChecked ? (isColorMatch ? 'success' : 'error') : 'action'} />
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                              Color
                            </Typography>
                          </Box>

                          {/* Done icon if match, Cross sign if mismatch */}
                          {hasColorChecked && (
                            <Tooltip title={isColorMatch ? `Motherboard matches outlook color (${baseManual})` : `MISMATCH! Outlook: ${manualOutlookColor} ≠ Motherboard: ${sickwMotherboardColor}`}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {isColorMatch ? (
                                  <ActiveCheckIcon fontSize="small" sx={{ color: '#10b981' }} />
                                ) : (
                                  <CancelIcon fontSize="small" sx={{ color: '#ef4444' }} />
                                )}
                              </Box>
                            </Tooltip>
                          )}
                        </Box>

                        <Box>
                          <Typography variant="body2" fontWeight={700} noWrap title={manualOutlookColor || sickwMotherboardColor || '—'}>
                            {manualOutlookColor || sickwMotherboardColor || <Typography component="span" variant="caption" color="text.secondary">Not fetched</Typography>}
                          </Typography>
                          {hasColorChecked && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.68rem', fontWeight: 600, color: isColorMatch ? 'success.main' : 'error.main', mt: 0.25 }} noWrap title={`Motherboard: ${sickwMotherboardColor}`}>
                              {isColorMatch ? `MB: ${sickwMotherboardColor}` : `MB: ${sickwMotherboardColor}`}
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>

                    {/* 2. MODEL NO (APPLE A-CODE FROM SERVICE 12 ONLY) */}
                    <Grid item xs={6} sm={4} md={2.4}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <ModelCodeIcon fontSize="small" color={keyModelCode !== '—' ? 'primary' : 'action'} />
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                              Model No
                            </Typography>
                          </Box>
                          {keyModelCode !== '—' && (
                            <IconButton size="small" onClick={() => handleCopyField(keyModelCode, 'Model No')} sx={{ p: 0.25 }}>
                              {copiedField === 'Model No' ? <CheckmarkIcon fontSize="inherit" color="success" /> : <CopyIcon fontSize="inherit" />}
                            </IconButton>
                          )}
                        </Box>
                        <Box>
                          {keyModelCode !== '—' ? (
                            <Chip label={keyModelCode} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem', fontFamily: 'monospace' }} />
                          ) : (
                            <Typography variant="body2" fontWeight={700} color="text.secondary">
                              —
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>

                    {/* 3. SERIAL NUMBER */}
                    <Grid item xs={6} sm={4} md={2.4}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <TagIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                              Serial No
                            </Typography>
                          </Box>
                          {keySerial !== '—' && (
                            <IconButton size="small" onClick={() => handleCopyField(keySerial, 'Serial No')} sx={{ p: 0.25 }}>
                              {copiedField === 'Serial No' ? <CheckmarkIcon fontSize="inherit" color="success" /> : <CopyIcon fontSize="inherit" />}
                            </IconButton>
                          )}
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: keySerial !== '—' ? 'monospace' : 'inherit' }} noWrap title={keySerial}>
                          {keySerial !== '—' ? keySerial : <Typography component="span" variant="caption" color="text.secondary">Not fetched</Typography>}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* 4. PURCHASE DATE */}
                    <Grid item xs={6} sm={4} md={2.4}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                          <DateIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                            Purchase Date
                          </Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={700} noWrap title={keyPurchaseDate}>
                          {keyPurchaseDate !== '—' ? formatDate(keyPurchaseDate) : <Typography component="span" variant="caption" color="text.secondary">Not fetched</Typography>}
                        </Typography>
                      </Paper>
                    </Grid>

                    {/* 5. SIM LOCK STATUS */}
                    <Grid item xs={12} sm={4} md={2.4}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#ffffff'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                          {isSimUnlocked ? (
                            <LockOpenIcon fontSize="small" color="success" />
                          ) : isSimLocked ? (
                            <LockIcon fontSize="small" color="error" />
                          ) : (
                            <SimCardIcon fontSize="small" color="action" />
                          )}
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: 0.5 }}>
                            SIM Lock
                          </Typography>
                        </Box>
                        <Box>
                          {isSimUnlocked ? (
                            <Chip icon={<LockOpenIcon fontSize="small" />} label="Unlocked" size="small" color="success" sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }} />
                          ) : isSimLocked ? (
                            <Chip icon={<LockIcon fontSize="small" />} label="Locked" size="small" color="error" sx={{ fontWeight: 700, height: 22, fontSize: '0.72rem' }} />
                          ) : keySimLock !== '—' ? (
                            <Typography variant="body2" fontWeight={600} noWrap>{keySimLock}</Typography>
                          ) : (
                            <Typography component="span" variant="caption" color="text.secondary">Run Srv 103</Typography>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                {/* RAW INFORMATION SECTION */}
                <Box sx={{ mt: 3 }}>
                  {(() => {
                    const servicePriceMap = { '92': 0.022, '12': 0.025, '103': 0.060 };
                    const totalBilled = sickwReports.reduce((sum, sr) => {
                      const p = parseFloat(sr.parsed_data?.price) || servicePriceMap[String(sr.service_id)] || 0;
                      return sum + p;
                    }, 0);

                    return (
                      <>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>
                              Raw API Response Information
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Exact diagnostic results returned by Sickw servers
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {isAdmin && totalBilled > 0 && (
                              <Chip
                                size="small"
                                label={`Total Billed: $${totalBilled.toFixed(3)} USD`}
                                sx={{
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                                  color: (theme) => theme.palette.mode === 'dark' ? '#34d399' : '#059669',
                                  height: 22
                                }}
                              />
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {sickwReports.length} {sickwReports.length === 1 ? 'report' : 'reports'} recorded
                            </Typography>
                          </Box>
                        </Box>

                        {sickwReports.length === 0 ? (
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 4,
                              textAlign: 'center',
                              borderRadius: 2,
                              backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.3)' : 'rgba(248, 250, 252, 0.5)'
                            }}
                          >
                            <SickwIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1, opacity: 0.6 }} />
                            <Typography variant="body2" fontWeight={600} color="text.secondary">
                              No Sickw diagnostic reports attached to this IMEI yet.
                            </Typography>
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                              Click Service 12, 92, or 103 above to run a live lookup.
                            </Typography>
                          </Paper>
                        ) : (
                          <Stack spacing={2}>
                            {sickwReports.map((sr, idx) => {
                              const srvLabel =
                                String(sr.service_id) === '12'
                                  ? 'Service 12 (Model No & Specs)'
                                  : String(sr.service_id) === '92'
                                  ? 'Service 92 (Color Only)'
                                  : String(sr.service_id) === '103'
                                  ? 'Service 103 (Carrier & SIM Lock)'
                                  : sr.service_id
                                  ? `Service ${sr.service_id}`
                                  : 'Diagnostic Report';

                              const billedAmt = sr.parsed_data?.price || servicePriceMap[String(sr.service_id)] || '0.000';

                              return (
                                <Paper
                                  key={sr.id || idx}
                                  variant="outlined"
                                  sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : '#ffffff'
                                  }}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                      <Chip label={srvLabel} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                                      {isAdmin && (
                                        <Chip
                                          label={`Billed: $${billedAmt} USD`}
                                          size="small"
                                          variant="outlined"
                                          sx={{
                                            fontWeight: 700,
                                            fontSize: '0.68rem',
                                            height: 20,
                                            color: 'success.main',
                                            borderColor: 'success.main',
                                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)'
                                          }}
                                        />
                                      )}
                                      <Typography variant="caption" color="text.secondary">
                                        {sr.created_at ? new Date(sr.created_at).toLocaleString() : '—'}
                                      </Typography>
                                    </Box>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={copiedReportId === sr.id ? <CheckmarkIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                                      onClick={() => handleCopyRaw(sr.raw_text, sr.id)}
                                      color={copiedReportId === sr.id ? 'success' : 'inherit'}
                                      sx={{ textTransform: 'none', fontWeight: 600 }}
                                    >
                                      {copiedReportId === sr.id ? 'Copied!' : 'Copy Raw Info'}
                                    </Button>
                                  </Box>

                                  {sr.raw_text ? (
                                    <Paper
                                      sx={{
                                        p: 1.75,
                                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#090d16' : '#1e293b',
                                        color: '#38bdf8',
                                        borderRadius: 1.5,
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                        fontSize: '0.78rem',
                                        lineHeight: 1.5,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        maxHeight: 280,
                                        overflowY: 'auto'
                                      }}
                                    >
                                      {sr.raw_text}
                                    </Paper>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      No raw payload text recorded.
                                    </Typography>
                                  )}
                                </Paper>
                              );
                            })}
                          </Stack>
                        )}
                      </>
                    );
                  })()}
                </Box>
              </Box>
            );
          })()}

          {/* TAB 6: NOTES */}
          {currentTab === 6 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Device Notes & Remarks
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Internal notes attached to this specific unit
              </Typography>

              {notes.length === 0 && !device.notes ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography color="text.secondary">
                    No notes recorded for this unit.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {device.notes && (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>GENERAL REMARKS</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{device.notes}</Typography>
                    </Paper>
                  )}
                  {notes.map((n) => (
                    <Paper key={n.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={700} color="primary">{n.author_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {n.created_at ? formatDate(n.created_at) : '—'}
                        </Typography>
                      </Box>
                      <Typography variant="body2">{n.content}</Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Device Permanently?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{device.model}</strong> (IMEI: {device.imei})? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Sickw Confirmation Dialog */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => !resettingSickw && setResetConfirmOpen(false)}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ResetIcon color="warning" /> Reset Sickw Diagnostic Data?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to reset all fetched Sickw diagnostic reports for device{' '}
            <strong>{device.imei}</strong>?
          </DialogContentText>
          <DialogContentText sx={{ mt: 1, fontSize: '0.85rem', color: 'text.secondary' }}>
            This will clear {sickwReports.length} recorded diagnostic {sickwReports.length === 1 ? 'report' : 'reports'} and reset the motherboard verification highlight, allowing you to re-fetch any service from scratch.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setResetConfirmOpen(false)} disabled={resettingSickw} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleResetSickw}
            disabled={resettingSickw}
            startIcon={resettingSickw ? <CircularProgress size={16} color="inherit" /> : <ResetIcon />}
          >
            {resettingSickw ? 'Resetting...' : 'Reset All Fetch Data'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Add Repair Dialog Popup */}
      <AddRepairDialog
        open={repairDialogOpen}
        onClose={() => {
          setRepairDialogOpen(false);
          if (device.current_status !== 'UNDER_REPAIR') {
            setStatus(device.current_status || 'IN_STOCK');
          }
        }}
        onRepairCreated={handleRepairCreated}
        initialDevice={device}
      />
    </>
  );
}
