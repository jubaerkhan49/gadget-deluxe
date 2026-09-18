import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Divider,
  Box,
  InputAdornment,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Storefront as StorefrontIcon,
  PhoneIphone as PhoneIcon,
  Build as RepairIcon,
  AttachMoney as MoneyIcon,
  BatteryChargingFull as BatteryIcon,
  CalendarToday as DateIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi } from '../api/client';

const VARIANTS = [
  'Modified',
  'USA eSim',
  'Canada',
  'Mexican',
  'Korea',
  'Singapore',
  'Bypass',
  'Other'
];

const B2B_STATUS_CHOICES = [
  { value: 'IN_INVENTORY', label: 'In Inventory (Ready / Waiting)' },
  { value: 'SENT_FOR_REPAIR', label: 'Under Repair' },
  { value: 'DELIVERED', label: 'Delivered to Shop' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

export default function EditB2BDeviceDialog({ open, onClose, device, onUpdated }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    model: '',
    variant: 'USA eSim',
    capacity: '',
    color: '',
    imei: '',
    imei2: '',
    serial_number: '',
    buying_price: '',
    b2b_selling_price: '',
    battery_health: '',
    battery_cycles: '',
    b2b_shop_name: '',
    b2b_delivery_date: '',
    b2b_has_issues: false,
    b2b_issue_notes: '',
    b2b_status: 'IN_INVENTORY',
    notes: ''
  });

  useEffect(() => {
    if (device) {
      setFormData({
        model: device.model || '',
        variant: device.variant || 'USA eSim',
        capacity: device.capacity || '',
        color: device.color || '',
        imei: device.imei || '',
        imei2: device.imei2 || '',
        serial_number: device.serial_number || '',
        buying_price: device.buying_price !== null && device.buying_price !== undefined ? device.buying_price : '',
        b2b_selling_price: device.b2b_selling_price !== null && device.b2b_selling_price !== undefined ? device.b2b_selling_price : '',
        battery_health: device.battery_health !== null && device.battery_health !== undefined ? device.battery_health : '',
        battery_cycles: device.battery_cycles !== null && device.battery_cycles !== undefined ? device.battery_cycles : '',
        b2b_shop_name: device.b2b_shop_name || '',
        b2b_delivery_date: device.b2b_delivery_date || '',
        b2b_has_issues: Boolean(device.b2b_has_issues),
        b2b_issue_notes: device.b2b_issue_notes || '',
        b2b_status: device.b2b_status || 'IN_INVENTORY',
        notes: device.notes || ''
      });
    }
  }, [device]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!device) return;

    if (!formData.model.trim() || !formData.imei.trim()) {
      enqueueSnackbar('Device Model and IMEI are required', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        model: formData.model.trim(),
        variant: formData.variant,
        capacity: formData.capacity.trim(),
        color: formData.color.trim(),
        imei: formData.imei.trim(),
        imei2: formData.imei2 ? formData.imei2.trim() : '',
        serial_number: formData.serial_number ? formData.serial_number.trim() : '',
        buying_price: formData.buying_price !== '' ? Number(formData.buying_price) : null,
        b2b_selling_price: formData.b2b_selling_price !== '' ? Number(formData.b2b_selling_price) : null,
        battery_health: formData.battery_health !== '' ? parseInt(formData.battery_health, 10) : null,
        battery_cycles: formData.battery_cycles !== '' ? parseInt(formData.battery_cycles, 10) : null,
        b2b_shop_name: formData.b2b_shop_name.trim(),
        b2b_delivery_date: formData.b2b_delivery_date || null,
        b2b_has_issues: formData.b2b_has_issues,
        b2b_issue_notes: formData.b2b_has_issues ? formData.b2b_issue_notes.trim() : '',
        b2b_status: formData.b2b_status,
        notes: formData.notes ? formData.notes.trim() : '',
        is_b2b: true
      };

      await deviceApi.update(device.id, payload);
      enqueueSnackbar('B2B Equipment details updated successfully', { variant: 'success' });
      onUpdated?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.detail || 'Failed to update device', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!device) return null;

  // Calculate live preview profit
  const buyCost = Number(formData.buying_price) || 0;
  const sellPrice = Number(formData.b2b_selling_price) || 0;
  const repairCost = Number(device.b2b_repair_cost) || 0;
  const calculatedProfit = sellPrice > 0 ? (sellPrice - buyCost - repairCost) : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSave}>
        <DialogTitle sx={{ pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'rgba(147, 51, 234, 0.12)',
                  color: '#9333EA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <StorefrontIcon />
              </Box>
              <div>
                <Typography variant="h6" fontWeight={800}>
                  Edit B2B Equipment Details
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Client: {formData.b2b_shop_name || 'Unassigned'} • IMEI: {device.imei}
                </Typography>
              </div>
            </Box>
            <Chip
              label={formData.b2b_status.replace(/_/g, ' ')}
              color={
                formData.b2b_status === 'DELIVERED'
                  ? 'success'
                  : formData.b2b_status === 'SENT_FOR_REPAIR'
                  ? 'warning'
                  : 'primary'
              }
              variant="outlined"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {/* Section 1: Client & Delivery Info */}
          <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorefrontIcon fontSize="small" /> B2B Order & Client Information
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Shop / Business Name"
                placeholder="e.g. Apple Hub, Tech Haven"
                value={formData.b2b_shop_name}
                onChange={(e) => handleChange('b2b_shop_name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="Expected / Delivery Date"
                value={formData.b2b_delivery_date}
                onChange={(e) => handleChange('b2b_delivery_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="B2B Status"
                value={formData.b2b_status}
                onChange={(e) => handleChange('b2b_status', e.target.value)}
              >
                {B2B_STATUS_CHOICES.map((choice) => (
                  <MenuItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          {/* Section 2: Pricing & Profit calculation */}
          <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MoneyIcon fontSize="small" /> Pricing & Profit Calculation (BDT)
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Selling Price (to Shop)"
                placeholder="0.00"
                value={formData.b2b_selling_price}
                onChange={(e) => handleChange('b2b_selling_price', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">৳</InputAdornment>
                }}
                helperText="Client final purchase amount"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Supplier Cost (Buying Price)"
                placeholder="0.00"
                value={formData.buying_price}
                onChange={(e) => handleChange('buying_price', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">৳</InputAdornment>
                }}
                helperText="Cost from shipment/supplier"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  ESTIMATED NET PROFIT
                </Typography>
                <Typography variant="h6" fontWeight={800} color="success.main">
                  {sellPrice > 0 ? `৳ ${calculatedProfit.toLocaleString()}` : '—'}
                </Typography>
                {repairCost > 0 && (
                  <Typography variant="caption" color="error.main">
                    (Repairs deducted: ৳ {repairCost.toLocaleString()})
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2.5 }} />

          {/* Section 3: Hardware Diagnostics & Battery */}
          <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <BatteryIcon fontSize="small" /> Diagnostics, Battery & Specs
          </Typography>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Device Model"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                select
                label="Variant"
                value={formData.variant}
                onChange={(e) => handleChange('variant', e.target.value)}
              >
                {VARIANTS.map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                label="Capacity"
                placeholder="256GB"
                value={formData.capacity}
                onChange={(e) => handleChange('capacity', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                label="Color"
                placeholder="Natural"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Primary IMEI"
                value={formData.imei}
                onChange={(e) => handleChange('imei', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="IMEI 2 (Optional)"
                value={formData.imei2}
                onChange={(e) => handleChange('imei2', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Serial Number (Optional)"
                value={formData.serial_number}
                onChange={(e) => handleChange('serial_number', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Battery Health (%)"
                placeholder="95"
                value={formData.battery_health}
                onChange={(e) => handleChange('battery_health', e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Battery Cycles"
                placeholder="120"
                value={formData.battery_cycles}
                onChange={(e) => handleChange('battery_cycles', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="General Notes"
                placeholder="Packaging, accessories, or client requests..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </Grid>
          </Grid>

          {/* Issue Reporting Box */}
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) => formData.b2b_has_issues
                ? (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.08)' : '#FEF2F2')
                : (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#F9FAFB'),
              border: '1px solid',
              borderColor: (theme) => formData.b2b_has_issues
                ? (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5')
                : 'divider'
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={formData.b2b_has_issues}
                  onChange={(e) => handleChange('b2b_has_issues', e.target.checked)}
                  color="error"
                />
              }
              label={
                <Typography variant="body2" fontWeight={700} color={formData.b2b_has_issues ? 'error.main' : 'text.primary'}>
                  {formData.b2b_has_issues ? 'Device has Hardware/Functional Issues' : 'No Issues Reported (Clean Condition)'}
                </Typography>
              }
            />

            {formData.b2b_has_issues && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Detailed Issue Description"
                  placeholder="e.g. Front glass cracked, Camera sensor blurry, FaceID failure..."
                  value={formData.b2b_issue_notes}
                  onChange={(e) => handleChange('b2b_issue_notes', e.target.value)}
                  required={formData.b2b_has_issues}
                />
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} color="inherit" />}
            sx={{
              background: 'linear-gradient(135deg, #9333EA 0%, #7928CA 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7E22CE 0%, #6B21A8 100%)'
              }
            }}
          >
            Save B2B Details
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
