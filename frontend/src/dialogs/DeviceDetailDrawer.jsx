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
  TableRow
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
import { deviceApi, userApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';

const STATUS_CHOICES = [
  { value: 'WAITING_SHIPMENT', label: 'Waiting Shipment' },
  { value: 'IN_STOCK', label: 'In Stock' },
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
  onDeviceDeleted
}) {
  const { enqueueSnackbar } = useSnackbar();
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

  useEffect(() => {
    if (open && device) {
      setStatus(device.current_status || 'WAITING_SHIPMENT');
      setOwner(device.current_owner || '');
      setReceivedDateBd(device.received_date_bd || '');
      setSellingPrice(device.selling_price ? String(device.selling_price) : '');
      fetchUsers();
    }
  }, [open, device]);

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
    ? Math.round(Number(device.buying_price)).toLocaleString()
    : '—';

  const sellingPriceFormatted = device.selling_price !== null && device.selling_price !== undefined
    ? Math.round(Number(device.selling_price)).toLocaleString()
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
            width: { xs: '100%', sm: 680, md: 800, lg: 900 },
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
            p: 3,
            pb: 1.5,
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
            <IconButton onClick={onClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Tab Navigation Header */}
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

        {/* Tab Content Panes */}
        <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>

          {/* TAB 0: OVERVIEW */}
          {currentTab === 0 && (
            <Stack spacing={3}>
              {/* Quick Management Actions */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 2,
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : '#F8FAFC'
                }}
              >
                <Typography variant="subtitle2" color="primary" fontWeight={700} gutterBottom sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Quick Status & Assignment
                </Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={status}
                        label="Status"
                        onChange={(e) => setStatus(e.target.value)}
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
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Selling Price (BDT)"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        placeholder="Enter selling price"
                      />
                    </Grid>
                  )}

                  <Grid item xs={12} sm={status === 'SOLD' ? 12 : 6}>
                    <Button
                      fullWidth
                      variant="contained"
                      disabled={savingStatus || (status === device.current_status && (!sellingPrice || sellingPrice === String(device.selling_price || '')))}
                      onClick={handleStatusChange}
                      startIcon={savingStatus ? <CircularProgress size={16} color="inherit" /> : <CheckIcon sx={{ color: '#ffffff !important' }} />}
                      sx={{
                        color: '#ffffff !important',
                        fontWeight: 600,
                        '&.Mui-disabled': {
                          color: 'rgba(255, 255, 255, 0.7) !important',
                          bgcolor: 'primary.main',
                          opacity: 0.65
                        }
                      }}
                    >
                      Update Status
                    </Button>
                  </Grid>

                  <Grid item xs={12} sm={8}>
                    <FormControl fullWidth size="small" disabled={loadingUsers}>
                      <InputLabel>Assigned Owner</InputLabel>
                      <Select
                        value={owner}
                        label="Assigned Owner"
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

                  <Grid item xs={12} sm={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled={savingOwner || owner === (device.current_owner || '')}
                      onClick={handleOwnerChange}
                      startIcon={savingOwner ? <CircularProgress size={16} color="inherit" /> : <PersonIcon />}
                    >
                      Assign
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* Hardware & Identifiers */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PhoneIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Hardware Specs & Identifiers
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">IMEI</Typography>
                    <CopyableText text={device.imei} />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Serial Number</Typography>
                    <CopyableText text={device.serial_number} />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Capacity</Typography>
                    <Typography variant="body2" fontWeight={600}>{device.capacity || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Color</Typography>
                    <Typography variant="body2" fontWeight={600}>{device.color || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Battery Health</Typography>
                    <Typography variant="body2" fontWeight={600} color={device.battery_health ? 'success.main' : 'text.primary'}>
                      {device.battery_health ? `${device.battery_health}%` : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Cycle Count</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {device.battery_cycle ? `${device.battery_cycle} cycles` : '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Financial & Logistics */}
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ShippingIcon color="action" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Financial & Logistics
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Buying Cost</Typography>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {buyingCostFormatted !== '—' ? `${buyingCostFormatted} BDT` : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Selling Price</Typography>
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {sellingPriceFormatted !== '—' ? `${sellingPriceFormatted} BDT` : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Supplier</Typography>
                    <Typography variant="body2" fontWeight={600}>{device.shipment_supplier || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Shipping Agent</Typography>
                    <Typography variant="body2" fontWeight={600}>{device.shipment_agent || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Received Date (CN)</Typography>
                    <Typography variant="body2" fontWeight={600}>{device.shipment_receive_date_cn || '—'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Received Date (BD)</Typography>
                    <TextField
                      type="date"
                      size="small"
                      value={receivedDateBd}
                      onChange={(e) => handleReceivedDateBdUpdate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        mt: 0.5,
                        width: '100%',
                        maxWidth: 170,
                        display: 'block',
                        '& .MuiOutlinedInput-root': {
                          height: 32,
                          borderRadius: 1.5,
                          fontSize: '0.8rem'
                        },
                        '& .MuiInputBase-input': {
                          py: 0.5,
                          px: 1
                        }
                      }}
                    />
                  </Grid>
                </Grid>
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
                            {r.repair_cost ? `${Math.round(Number(r.repair_cost)).toLocaleString()} BDT` : '0 BDT'}
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
                            {Math.round(Number(s.selling_price || 0)).toLocaleString()} BDT
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Realized Profit</Typography>
                          <Typography variant="body2" fontWeight={700} color="info.main">
                            {s.profit ? `${Math.round(Number(s.profit)).toLocaleString()} BDT` : '—'}
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
    </>
  );
}
