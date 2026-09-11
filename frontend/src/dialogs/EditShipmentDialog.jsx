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
  Tabs
} from '@mui/material';
import {
  Edit as EditIcon,
  CheckCircleOutline as CheckIcon,
  LocalShipping as ShippingIcon,
  AttachMoney as MoneyIcon,
  PlaylistAdd as AddDevicesIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { shipmentApi, deviceApi } from '../api/client';
import { formatNumber } from '../utils/formatters';

const VARIANTS = ['Modified', 'USA eSim', 'Canada', 'Mexican', 'Korea', 'Singapore', 'Bypass'];

export default function EditShipmentDialog({ open, onClose, shipment, onShipmentUpdated }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

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
    }
  }, [open, shipment]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (!shipment) return null;

  const deviceCount = shipment.devices_count || 0;
  const grossShipping = parseFloat(formData.shipping_cost) || 0;
  const discount = parseFloat(formData.discount) || 0;
  const netShipping = Math.max(grossShipping - discount, 0);
  const unitFreight = deviceCount > 0 ? netShipping / deviceCount : netShipping;

  const newImeisList = formData.append_imeis
    .split(/[\r\n,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
          <Tab label="Add Devices to Batch" icon={<AddDevicesIcon fontSize="small" />} iconPosition="start" />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
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

          {tabIndex === 1 && (
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
  );
}
