import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Paper,
  Box,
  Divider,
  CircularProgress,
  Chip,
  Stack,
  MenuItem,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  InputAdornment,
  DialogContentText,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  CheckCircleOutline as CheckIcon,
  LocalShipping as ShippingIcon,
  AttachMoney as MoneyIcon,
  PlaylistAdd as AddDevicesIcon,
  InfoOutlined as InfoIcon,
  PhoneAndroid as PhoneIcon,
  DeleteOutline as DeleteIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  BatteryChargingFull as BatteryIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api, { shipmentApi, deviceApi } from '../api/client';
import { formatNumber } from '../utils/formatters';
import VariantBadge from '../components/common/VariantBadge';
import StatusBadge from '../components/common/StatusBadge';
import CopyableText from '../components/common/CopyableText';

const VARIANTS = ['Modified', 'USA eSim', 'Canada', 'Mexican', 'Korea', 'Singapore', 'Bypass'];

const STATUS_CHOICES = [
  { value: 'WAITING_SHIPMENT', label: 'Waiting Shipment' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RETURNED', label: 'Returned' }
];

export default function EditShipmentDialog({ open, onClose, shipment, onShipmentUpdated }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  // Shipment form data
  const [formData, setFormData] = useState({
    tracking_number: '',
    supplier_name: '',
    shipping_company: '',
    receive_date: '',
    country: 'China',
    shipping_cost: '',
    discount: '',
    notes: '',
    // Batch addition fields (optional)
    append_imeis: '',
    append_model: 'iPhone 15 Pro Max',
    append_variant: 'Modified',
    append_capacity: '256GB',
    append_color: 'Natural Titanium',
    append_item_price: ''
  });

  // Shipment devices state for Tab 1
  const [shipmentDevices, setShipmentDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [users, setUsers] = useState([]);

  // Sub-dialogs for editing & deleting individual equipment
  const [editingDevice, setEditingDevice] = useState(null);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [deletingDevice, setDeletingDevice] = useState(false);

  useEffect(() => {
    if (open && shipment) {
      setTabIndex(0);
      setFormData({
        tracking_number: shipment.tracking_number || '',
        supplier_name: shipment.supplier_name || '',
        shipping_company: shipment.shipping_company || '',
        receive_date: shipment.receive_date || '',
        country: shipment.country || 'China',
        shipping_cost: shipment.shipping_cost ? String(shipment.shipping_cost) : '',
        discount: shipment.discount ? String(shipment.discount) : '',
        notes: shipment.notes || '',
        append_imeis: '',
        append_model: 'iPhone 15 Pro Max',
        append_variant: 'Modified',
        append_capacity: '256GB',
        append_color: 'Natural Titanium',
        append_item_price: ''
      });
      setDeviceSearchQuery('');
      fetchShipmentDevices();
      fetchUsers();
    }
  }, [open, shipment]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users/');
      setUsers(res.data?.results || res.data || []);
    } catch (e) {
      // ignore
    }
  };

  const fetchShipmentDevices = async () => {
    if (!shipment) return;
    try {
      setDevicesLoading(true);
      const res = await deviceApi.getAll({ current_shipment: shipment.id });
      const all = res.data?.results || res.data || [];
      // Secondary filter just in case backend query parameter was ignored
      const filtered = all.filter((d) => d.current_shipment === shipment.id || !d.current_shipment);
      setShipmentDevices(all.length > 0 ? (all.some(d => d.current_shipment === shipment.id) ? all.filter(d => d.current_shipment === shipment.id) : filtered) : []);
    } catch (err) {
      console.error('Error loading shipment devices:', err);
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (!shipment) return null;

  const deviceCount = shipmentDevices.length > 0 ? shipmentDevices.length : (shipment.devices_count || 0);
  const grossShipping = parseFloat(formData.shipping_cost) || 0;
  const discount = parseFloat(formData.discount) || 0;
  const netShipping = Math.max(grossShipping - discount, 0);
  const unitFreight = deviceCount > 0 ? netShipping / deviceCount : netShipping;

  const newImeisList = formData.append_imeis
    .split(/[\r\n,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Filtered devices for Equipment Tab search
  const filteredEquipment = shipmentDevices.filter((d) => {
    if (!deviceSearchQuery.trim()) return true;
    const q = deviceSearchQuery.toLowerCase();
    return (
      d.imei?.toLowerCase().includes(q) ||
      d.imei2?.toLowerCase().includes(q) ||
      d.serial_number?.toLowerCase().includes(q) ||
      d.model?.toLowerCase().includes(q) ||
      d.color?.toLowerCase().includes(q) ||
      d.variant?.toLowerCase().includes(q)
    );
  });

  // Handle Deleting an Equipment from this Shipment
  const handleDeleteEquipmentConfirm = async () => {
    if (!deviceToDelete) return;
    try {
      setDeletingDevice(true);
      await deviceApi.delete(deviceToDelete.id);
      enqueueSnackbar(`Device ${deviceToDelete.model} (IMEI: ${deviceToDelete.imei}) deleted successfully`, {
        variant: 'success'
      });
      setShipmentDevices((prev) => prev.filter((d) => d.id !== deviceToDelete.id));
      setDeviceToDelete(null);
      if (onShipmentUpdated) onShipmentUpdated({ ...shipment, devices_count: Math.max(0, deviceCount - 1) });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.detail || 'Failed to delete device', { variant: 'error' });
    } finally {
      setDeletingDevice(false);
    }
  };

  // Handle Updating an Equipment from Sub-Dialog
  const handleEquipmentUpdated = (updatedDevice) => {
    setShipmentDevices((prev) =>
      prev.map((d) => (d.id === updatedDevice.id ? { ...d, ...updatedDevice } : d))
    );
    setEditingDevice(null);
    enqueueSnackbar(`Equipment ${updatedDevice.model} updated successfully!`, { variant: 'success' });
    if (onShipmentUpdated) onShipmentUpdated(shipment);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tracking_number.trim()) {
      enqueueSnackbar('Tracking Number is required', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);

      // 1. Update Shipment Header & Logistics
      const payload = {
        tracking_number: formData.tracking_number.trim(),
        supplier_name: formData.supplier_name.trim(),
        shipping_company: formData.shipping_company.trim() || null,
        receive_date: formData.receive_date || null,
        country: formData.country.trim() || null,
        shipping_cost: grossShipping,
        discount: discount,
        notes: formData.notes.trim() || null
      };

      const res = await shipmentApi.update(shipment.id, payload);

      // 2. If new IMEIs were appended, create batch entries
      if (newImeisList.length > 0) {
        await shipmentApi.createBatch({
          tracking_number: formData.tracking_number.trim(),
          supplier_name: formData.supplier_name.trim(),
          shipping_company: formData.shipping_company.trim(),
          product_name: formData.append_model.trim(),
          variant: formData.append_variant,
          capacity: formData.append_capacity,
          color: formData.append_color,
          item_price: parseFloat(formData.append_item_price) || 0,
          shipment_fees: unitFreight,
          discount: 0,
          product_identifier: formData.append_imeis.trim()
        });
      }

      enqueueSnackbar('Shipment details updated successfully!', { variant: 'success' });
      if (onShipmentUpdated) onShipmentUpdated(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.detail || err.response?.data?.error || 'Failed to update shipment', {
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <EditIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Edit Shipment #{shipment.tracking_number}
            </Typography>
          </Box>
          <Chip
            label={`${deviceCount} Devices in Batch`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </DialogTitle>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)}>
            <Tab label="Logistics & Pricing" icon={<ShippingIcon fontSize="small" />} iconPosition="start" />
            <Tab
              label={`Batch Equipment Details (${deviceCount})`}
              icon={<PhoneIcon fontSize="small" />}
              iconPosition="start"
            />
            <Tab label="Add Devices to Batch" icon={<AddDevicesIcon fontSize="small" />} iconPosition="start" />
          </Tabs>
        </Box>

        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ p: 3 }}>
            {/* TAB 0: LOGISTICS & PRICING */}
            {tabIndex === 0 && (
              <Grid container spacing={2.5}>
                {/* Header Logistics */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    required
                    size="small"
                    label="Tracking Number"
                    value={formData.tracking_number}
                    onChange={handleChange('tracking_number')}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Supplier Name"
                    value={formData.supplier_name}
                    onChange={handleChange('supplier_name')}
                    placeholder="e.g. Shenzhen Tech"
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Shipping Agent / Company"
                    value={formData.shipping_company}
                    onChange={handleChange('shipping_company')}
                    placeholder="e.g. FastCargo HK / DHL"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Received Date (CN)"
                    value={formData.receive_date}
                    onChange={handleChange('receive_date')}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Origin / Country"
                    value={formData.country}
                    onChange={handleChange('country')}
                    placeholder="China"
                  />
                </Grid>

                {/* Financials & Freight */}
                <Grid item xs={12}>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Freight & Discount (BDT)
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Total Shipping Cost (BDT)"
                    value={formData.shipping_cost}
                    onChange={handleChange('shipping_cost')}
                    placeholder="e.g. 15000"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Discount / Cashback (BDT)"
                    value={formData.discount}
                    onChange={handleChange('discount')}
                    placeholder="e.g. 1000"
                  />
                </Grid>

                {/* Calculation Summary Card */}
                <Grid item xs={12}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#F1F5F9'
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Net Total Freight</Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="primary">
                          {formatNumber(netShipping)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Units in Batch</Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {deviceCount}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">Effective Unit Freight</Typography>
                        <Typography variant="subtitle1" fontWeight={700} color="success.main">
                          {formatNumber(unitFreight)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2.5}
                    size="small"
                    label="Shipment Notes / Airway Bill Remarks"
                    value={formData.notes}
                    onChange={handleChange('notes')}
                  />
                </Grid>
              </Grid>
            )}

            {/* TAB 1: BATCH EQUIPMENT DETAILS (UPDATE SPECS & DELETE UNITS) */}
            {tabIndex === 1 && (
              <Box>
                {/* Search & Stats Bar */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                  <TextField
                    size="small"
                    placeholder="Search by IMEI, Model, Color, or Serial..."
                    value={deviceSearchQuery}
                    onChange={(e) => setDeviceSearchQuery(e.target.value)}
                    sx={{ width: { xs: '100%', sm: 360 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: deviceSearchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setDeviceSearchQuery('')}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null
                    }}
                  />

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      label={`Total: ${shipmentDevices.length}`}
                      color="default"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      size="small"
                      label={`Waiting: ${shipmentDevices.filter(d => d.current_status === 'WAITING_SHIPMENT').length}`}
                      color="warning"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      size="small"
                      label={`In Stock: ${shipmentDevices.filter(d => d.current_status === 'IN_STOCK').length}`}
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </Stack>

                {/* Devices Table */}
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 420 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Equipment Model</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>IMEI / Identifiers</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Cost (BDT)</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Battery</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Assigned Owner</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, pr: 2 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {devicesLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                            <CircularProgress size={28} />
                          </TableCell>
                        </TableRow>
                      ) : filteredEquipment.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                            {deviceSearchQuery ? 'No equipment matched your search.' : 'No devices found in this shipment batch.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEquipment.map((dev) => (
                          <TableRow key={dev.id} hover>
                            {/* Model & Specs */}
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>
                                {dev.model || 'Unknown Model'}
                              </Typography>
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                                <VariantBadge variant={dev.variant} />
                                {(dev.capacity || dev.color) && (
                                  <Typography variant="caption" color="text.secondary">
                                    {dev.capacity} {dev.color ? `• ${dev.color}` : ''}
                                  </Typography>
                                )}
                              </Stack>
                            </TableCell>

                            {/* IMEI */}
                            <TableCell>
                              <CopyableText text={dev.imei} />
                              {(dev.imei2 || dev.serial_number) && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {dev.imei2 ? `2: ${dev.imei2}` : ''} {dev.serial_number ? `S/N: ${dev.serial_number}` : ''}
                                </Typography>
                              )}
                            </TableCell>

                            {/* Buying Price */}
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {dev.buying_price ? formatNumber(dev.buying_price) : '—'}
                              </Typography>
                            </TableCell>

                            {/* Battery */}
                            <TableCell>
                              <Typography variant="body2">
                                {dev.battery_health ? `${dev.battery_health}%` : '—'}
                              </Typography>
                              {dev.battery_cycle && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  CC: {dev.battery_cycle}
                                </Typography>
                              )}
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <StatusBadge status={dev.current_status} statusDisplay={dev.current_status_display} />
                            </TableCell>

                            {/* Owner */}
                            <TableCell>
                              <Typography variant="body2" color={dev.current_owner_name ? 'text.primary' : 'text.secondary'}>
                                {dev.current_owner_name || 'Unassigned'}
                              </Typography>
                            </TableCell>

                            {/* Actions (Edit Specs & Delete) */}
                            <TableCell align="right" sx={{ pr: 1.5, whiteSpace: 'nowrap' }}>
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                                <Tooltip title="Update Equipment Details" arrow>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => setEditingDevice(dev)}
                                    sx={{
                                      bgcolor: 'rgba(59, 130, 246, 0.08)',
                                      borderRadius: 1.5,
                                      '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)' }
                                    }}
                                  >
                                    <EditIcon sx={{ fontSize: '1.1rem' }} />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Delete Equipment from Batch" arrow>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => setDeviceToDelete(dev)}
                                    sx={{
                                      bgcolor: 'rgba(239, 68, 68, 0.08)',
                                      borderRadius: 1.5,
                                      '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' }
                                    }}
                                  >
                                    <DeleteIcon sx={{ fontSize: '1.1rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* TAB 2: ADD DEVICES TO BATCH */}
            {tabIndex === 2 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)',
                      borderColor: 'primary.main'
                    }}
                  >
                    <Typography variant="body2" color="primary" fontWeight={600}>
                      Append more IMEI or Serial units directly into Shipment #{shipment.tracking_number}.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Model Template"
                    value={formData.append_model}
                    onChange={handleChange('append_model')}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Variant"
                    value={formData.append_variant}
                    onChange={handleChange('append_variant')}
                  >
                    {VARIANTS.map((v) => (
                      <MenuItem key={v} value={v}>{v}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Unit Item Price (BDT)"
                    value={formData.append_item_price}
                    onChange={handleChange('append_item_price')}
                    placeholder="e.g. 95000"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Storage"
                    value={formData.append_capacity}
                    onChange={handleChange('append_capacity')}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Color"
                    value={formData.append_color}
                    onChange={handleChange('append_color')}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      PASTE NEW IMEIS (OPTIONAL)
                    </Typography>
                    {newImeisList.length > 0 && (
                      <Chip size="small" label={`${newImeisList.length} new device(s) to add`} color="primary" />
                    )}
                  </Stack>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Paste additional IMEIs or serials here (one per line)..."
                    value={formData.append_imeis}
                    onChange={handleChange('append_imeis')}
                    InputProps={{
                      sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
                    }}
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            >
              Save Changes
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Sub-Dialog: Update Equipment Details */}
      {editingDevice && (
        <EditEquipmentSubDialog
          open={Boolean(editingDevice)}
          device={editingDevice}
          users={users}
          onClose={() => setEditingDevice(null)}
          onSave={handleEquipmentUpdated}
        />
      )}

      {/* Confirmation Dialog: Delete Equipment */}
      {deviceToDelete && (
        <Dialog open={Boolean(deviceToDelete)} onClose={() => setDeviceToDelete(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main', pb: 1 }}>
            <DeleteIcon color="error" />
            <Typography variant="h6" fontWeight={700}>
              Delete Equipment?
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 1 }}>
              Are you sure you want to permanently delete this device from the shipment and inventory?
            </DialogContentText>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {deviceToDelete.model}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                IMEI: {deviceToDelete.imei}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Variant: {deviceToDelete.variant} • {deviceToDelete.capacity} • {deviceToDelete.color}
              </Typography>
            </Paper>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setDeviceToDelete(null)} disabled={deletingDevice}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteEquipmentConfirm}
              disabled={deletingDevice}
              startIcon={deletingDevice ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            >
              {deletingDevice ? 'Deleting...' : 'Delete Device'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}

// Sub-component: Edit Equipment Dialog
function EditEquipmentSubDialog({ open, device, users, onClose, onSave }) {
  const [formData, setFormData] = useState({
    model: device.model || '',
    variant: device.variant || 'Modified',
    capacity: device.capacity || '',
    color: device.color || '',
    imei: device.imei || '',
    imei2: device.imei2 || '',
    serial_number: device.serial_number || '',
    current_status: device.current_status || 'WAITING_SHIPMENT',
    battery_health: device.battery_health !== null && device.battery_health !== undefined ? String(device.battery_health) : '',
    battery_cycle: device.battery_cycle !== null && device.battery_cycle !== undefined ? String(device.battery_cycle) : '',
    buying_price: device.buying_price !== null && device.buying_price !== undefined ? String(device.buying_price) : '',
    current_owner: device.current_owner || '',
    notes: device.notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.model.trim()) {
      setError('Model Name is required');
      return;
    }
    if (!formData.imei.trim()) {
      setError('Primary IMEI is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        model: formData.model.trim(),
        variant: formData.variant,
        capacity: formData.capacity.trim() || null,
        color: formData.color.trim() || null,
        imei: formData.imei.trim(),
        imei2: formData.imei2.trim() || null,
        serial_number: formData.serial_number.trim() || null,
        current_status: formData.current_status,
        battery_health: formData.battery_health !== '' && !isNaN(formData.battery_health) ? parseInt(formData.battery_health, 10) : null,
        battery_cycle: formData.battery_cycle !== '' && !isNaN(formData.battery_cycle) ? parseInt(formData.battery_cycle, 10) : null,
        buying_price: formData.buying_price !== '' && !isNaN(formData.buying_price) ? parseFloat(formData.buying_price) : 0,
        current_owner: formData.current_owner ? parseInt(formData.current_owner, 10) : null,
        notes: formData.notes.trim() || null
      };

      const res = await deviceApi.update(device.id, payload);
      onSave(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.detail || err.response?.data?.imei?.[0] || 'Failed to update equipment details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <EditIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Update Equipment Specs
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" fontWeight={700} color="primary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Hardware Identifiers
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                size="small"
                label="Primary IMEI *"
                value={formData.imei}
                onChange={handleChange('imei')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Secondary IMEI2"
                value={formData.imei2}
                onChange={handleChange('imei2')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                size="small"
                label="Model Name *"
                value={formData.model}
                onChange={handleChange('model')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Serial Number"
                value={formData.serial_number}
                onChange={handleChange('serial_number')}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 0.5 }}>
              <Typography variant="caption" fontWeight={700} color="primary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Specifications & Status
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Variant"
                value={formData.variant}
                onChange={handleChange('variant')}
              >
                {VARIANTS.map((v) => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Capacity"
                value={formData.capacity}
                onChange={handleChange('capacity')}
                placeholder="256GB"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Color"
                value={formData.color}
                onChange={handleChange('color')}
                placeholder="Natural Titanium"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Inventory Status"
                value={formData.current_status}
                onChange={handleChange('current_status')}
              >
                {STATUS_CHOICES.map((sc) => (
                  <MenuItem key={sc.value} value={sc.value}>{sc.label}</MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Buying Price (BDT)"
                value={formData.buying_price}
                onChange={handleChange('buying_price')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">BDT</InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={12} sx={{ mt: 0.5 }}>
              <Typography variant="caption" fontWeight={700} color="primary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Battery & Assignment
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Battery Health"
                value={formData.battery_health}
                onChange={handleChange('battery_health')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Battery Cycle"
                value={formData.battery_cycle}
                onChange={handleChange('battery_cycle')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">CC</InputAdornment>
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Assigned Owner"
                value={formData.current_owner}
                onChange={handleChange('current_owner')}
              >
                <MenuItem value="">
                  <em>None (Unassigned)</em>
                </MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.username}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Remarks / Notes"
                value={formData.notes}
                onChange={handleChange('notes')}
                placeholder="Physical condition, hardware issues, notes..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Equipment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
