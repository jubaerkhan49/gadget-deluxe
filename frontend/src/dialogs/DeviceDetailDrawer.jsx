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
  CheckCircle as ActiveCheckIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { formatNumber, formatDate } from '../utils/formatters';
import { deviceApi, userApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';
import AddRepairDialog from './AddRepairDialog';

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

  const assignments = device.assignments || [];
  const history = device.history || [];
  const repairs = device.repairs || [];
  const sales = device.sales || [];
  const sickwReports = device.sickw_reports || [];
  const notes = device.device_notes || [];

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

        {/* Tab Navigation Header (Admin only) */}
        {isAdmin && (
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
                icon={<OverviewIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label="Overview"
                sx={{ minHeight: 46, minWidth: 0, px: 1.2, textTransform: 'none', fontWeight: 600, fontSize: '0.84rem' }}
              />
              <Tab
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
              <Tab
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
              <Tab
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
              <Tab
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
              <Tab
                icon={<SickwIcon sx={{ fontSize: 17 }} />}
                iconPosition="start"
                label="Sickw Report"
                sx={{ minHeight: 46, minWidth: 0, px: 1.2, textTransform: 'none', fontWeight: 600, fontSize: '0.84rem' }}
              />
              <Tab
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
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: (theme) =>
                      theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="primary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Custody & Assignment
                    </Typography>
                    <StatusBadge status={device.current_status} />
                  </Box>
                  <Grid container spacing={1.5} sx={{ mt: 0.2 }}>
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
                    <Box sx={{ display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-start' }, mt: 1.5 }}>
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
                          minWidth: { sm: 160 },
                          px: 2.5,
                          fontWeight: 700,
                          borderRadius: 1.75,
                          height: 38,
                          textTransform: 'none',
                          fontSize: '0.84rem',
                          boxShadow: 'none'
                        }}
                      >
                        Mark as Sold
                      </Button>
                    </Box>
                  )}

                  {device.current_status === 'PENDING_SALE' && (
                    <Alert severity="warning" sx={{ mt: 1.5, py: 0.5, borderRadius: 2 }}>
                      <strong>Pending Sale Approval:</strong> A sale request for this device is awaiting Admin pricing review and confirmation.
                    </Alert>
                  )}
                </Paper>
              )}

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
                          <Typography variant="body2" fontWeight={600} sx={{ mt: 0.2 }}>{device.shipment_receive_date_cn || '—'}</Typography>
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
                            {n.created_at ? new Date(n.created_at).toLocaleDateString() : '—'}
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
                              {a.assigned_date ? new Date(a.assigned_date).toLocaleDateString() : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {a.returned_date ? new Date(a.returned_date).toLocaleDateString() : '—'}
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
                          <Typography variant="body2">{r.sent_date || '—'}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" color="text.secondary">Return Date</Typography>
                          <Typography variant="body2">{r.returned_date || '—'}</Typography>
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
                          {s.sale_date ? new Date(s.sale_date).toLocaleDateString() : '—'}
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
          {currentTab === 5 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Sickw Diagnostic Report
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Official Apple / Sickw carrier lock, iCloud FMI, and warranty lookup results
              </Typography>

              {sickwReports.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                  <Typography color="text.secondary">
                    No Sickw diagnostic reports attached to this IMEI yet.
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2}>
                  {sickwReports.map((sr) => (
                    <Paper key={sr.id} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {sr.model_description || sr.model || 'Report Details'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sr.created_at ? new Date(sr.created_at).toLocaleDateString() : '—'}
                        </Typography>
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">iCloud Lock / FMI</Typography>
                          <Typography variant="body2" fontWeight={600} color={sr.icloud_lock === 'OFF' ? 'success.main' : 'warning.main'}>
                            {sr.icloud_lock || '—'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">SIM Lock Status</Typography>
                          <Typography variant="body2" fontWeight={600}>{sr.sim_lock_status || sr.locked_carrier || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Warranty Status</Typography>
                          <Typography variant="body2" fontWeight={600}>{sr.warranty_status || '—'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Purchase Country</Typography>
                          <Typography variant="body2" fontWeight={600}>{sr.purchase_country || '—'}</Typography>
                        </Grid>
                      </Grid>
                      {sr.raw_text && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>RAW PAYLOAD</Typography>
                          <Paper sx={{ p: 1.5, mt: 0.5, bgcolor: 'background.default', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                            {sr.raw_text}
                          </Paper>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          )}

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
                          {n.created_at ? new Date(n.created_at).toLocaleDateString() : '—'}
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
