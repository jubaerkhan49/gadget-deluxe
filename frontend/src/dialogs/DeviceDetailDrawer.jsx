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
  Tooltip
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
  CheckCircleOutline as CheckIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi, userApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';

const STATUS_CHOICES = [
  { value: 'WAITING_SHIPMENT', label: 'Waiting Shipment' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
  { value: 'SOLD', label: 'Sold' },
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

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 540 },
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
            pb: 2,
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
              theme.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)'
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
            <Tooltip title="Edit Device">
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

        {/* Body Content */}
        <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
          {/* Quick Management Actions */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              mb: 3,
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
                    label="Selling Price"
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
                  startIcon={savingStatus ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
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
                    {users.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.username} {u.first_name ? `(${u.first_name} ${u.last_name || ''})` : ''}
                      </MenuItem>
                    ))}
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
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Hardware Identifiers
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Primary IMEI</Typography>
                <CopyableText text={device.imei} />
              </Box>
              {device.imei2 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">IMEI 2</Typography>
                  <CopyableText text={device.imei2} />
                </Box>
              )}
              {device.serial_number && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Serial Number</Typography>
                  <CopyableText text={device.serial_number} />
                </Box>
              )}
              {device.meid && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">MEID</Typography>
                  <CopyableText text={device.meid} />
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Device Specifications */}
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Device Specifications
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Storage & Color</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {device.capacity || '—'} {device.color ? `• ${device.color}` : ''}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Battery</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {device.battery_health ? `${device.battery_health}%` : '—'}
                  {device.battery_cycle ? ` (${device.battery_cycle} cycles)` : ''}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Face ID / True Tone</Typography>
                <Typography variant="body1" fontWeight={600}>
                  {device.face_id || 'Working'} / {device.true_tone || 'Working'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Pricing & Tracking */}
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Financials & Logistics
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Buying Cost</Typography>
                <Typography variant="h6" fontWeight={700} color="primary">
                  {buyingCostFormatted}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Selling Price</Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {sellingPriceFormatted}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }} />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Supplier Name</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {device.shipment_supplier || 'Unknown'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Shipping Agent</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {device.shipment_agent || 'None'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Received Date (CN)</Typography>
                <Typography variant="body2" fontWeight={700} color="primary">
                  {device.shipment_receive_date_cn || 'Pending'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Current Shipment ID</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {device.current_shipment
                    ? `#${device.current_shipment}${device.shipment_tracking ? ` (${device.shipment_tracking})` : ''}`
                    : 'No Shipment'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 0.5 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Received Date (BD)"
                  value={receivedDateBd}
                  onChange={(e) => handleReceivedDateBdUpdate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Notes */}
          {device.notes && (
            <>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={700} sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Notes
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, backgroundColor: 'action.hover' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                  {device.notes}
                </Typography>
              </Paper>
            </>
          )}
        </Box>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Device?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{device.model}</strong> (IMEI: {device.imei})? This action cannot be undone and will permanently remove associated records.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
