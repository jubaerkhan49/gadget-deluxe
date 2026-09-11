import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Typography,
  Paper,
  Box,
  Divider,
  CircularProgress,
  Stack,
  Chip
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  CheckCircleOutline as CheckIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { shipmentApi } from '../api/client';

const VARIANTS = [
  'Modified',
  'USA eSim',
  'Canada',
  'Mexican',
  'Korea',
  'Singapore',
  'Bypass'
];

export default function AddShipmentDialog({ open, onClose, onShipmentCreated }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    tracking_number: '',
    supplier_name: '',
    shipping_company: '',
    product_name: 'iPhone 15 Pro Max',
    variant: 'Modified',
    capacity: '256GB',
    color: 'Natural Titanium',
    item_price: '',
    shipment_fees: '',
    discount: '',
    product_identifier: ''
  });

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // Calculate live numbers
  const identifiers = formData.product_identifier
    .split(/[\r\n,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  
  const unitCount = identifiers.length > 0 ? identifiers.length : 1;
  const itemPrice = parseFloat(formData.item_price) || 0;
  const feePerUnit = parseFloat(formData.shipment_fees) || 0;
  const discount = parseFloat(formData.discount) || 0;

  const grossShipping = feePerUnit * unitCount;
  const netShipping = Math.max(grossShipping - discount, 0);
  const effectiveUnitShipping = unitCount > 0 ? netShipping / unitCount : 0;
  const totalCostPerUnit = itemPrice + effectiveUnitShipping;
  const totalBatchCost = totalCostPerUnit * unitCount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tracking_number.trim()) {
      enqueueSnackbar('Tracking Number is required', { variant: 'error' });
      return;
    }
    if (!formData.supplier_name.trim()) {
      enqueueSnackbar('Supplier Name is required', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        tracking_number: formData.tracking_number.trim(),
        supplier_name: formData.supplier_name.trim(),
        shipping_company: formData.shipping_company.trim(),
        product_name: formData.product_name.trim(),
        variant: formData.variant,
        capacity: formData.capacity,
        color: formData.color,
        item_price: itemPrice,
        shipment_fees: feePerUnit,
        discount: discount,
        product_identifier: formData.product_identifier.trim()
      };

      const res = await shipmentApi.createBatch(payload);
      enqueueSnackbar(
        `Batch created successfully! ${res.data.total_processed || 0} device(s) registered.`,
        { variant: 'success' }
      );
      if (onShipmentCreated) onShipmentCreated(res.data.shipment);
      onClose();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.error || err.response?.data?.detail || 'Failed to create shipment batch', {
        variant: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <ShippingIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Create Inbound Shipment Batch
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            {/* Shipment Logistics */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Shipment & Supplier Info
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                size="small"
                label="Tracking Number"
                value={formData.tracking_number}
                onChange={handleChange('tracking_number')}
                placeholder="e.g. SF1892837492"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                size="small"
                label="Supplier / Vendor"
                value={formData.supplier_name}
                onChange={handleChange('supplier_name')}
                placeholder="e.g. Shenzhen Tech Co"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Shipping Agent / Company"
                value={formData.shipping_company}
                onChange={handleChange('shipping_company')}
                placeholder="e.g. FastCargo HK"
              />
            </Grid>

            {/* Device Defaults */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Device Specs Template
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                label="Model Name"
                value={formData.product_name}
                onChange={handleChange('product_name')}
                placeholder="e.g. iPhone 15 Pro Max"
              />
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
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                size="small"
                label="Storage"
                value={formData.capacity}
                onChange={handleChange('capacity')}
                placeholder="256GB"
              />
            </Grid>

            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                size="small"
                label="Color"
                value={formData.color}
                onChange={handleChange('color')}
                placeholder="Titanium"
              />
            </Grid>

            {/* Financials */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Pricing & Freight (BDT)
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Unit Item Price"
                value={formData.item_price}
                onChange={handleChange('item_price')}
                placeholder="e.g. 95000"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Shipment Fee / Unit"
                value={formData.shipment_fees}
                onChange={handleChange('shipment_fees')}
                placeholder="e.g. 1500"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Discount / Cashback"
                value={formData.discount}
                onChange={handleChange('discount')}
                placeholder="e.g. 500"
              />
            </Grid>

            {/* Bulk IMEI Input */}
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Batch IMEIs / Serials
                </Typography>
                <Chip
                  size="small"
                  label={`${identifiers.length} device(s) entered`}
                  color={identifiers.length > 0 ? "primary" : "default"}
                  variant="outlined"
                />
              </Stack>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Paste IMEIs or Serial Numbers here (one per line, comma or space separated)..."
                value={formData.product_identifier}
                onChange={handleChange('product_identifier')}
                helperText="Leave empty to create shipment header only without auto-registering devices."
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
                }}
              />
            </Grid>

            {/* Live Calculation Preview Banner */}
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
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Total Units</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {unitCount}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Net Unit Freight</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {Math.round(effectiveUnitShipping).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Total Cost / Unit</Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="primary">
                      {Math.round(totalCostPerUnit).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="text.secondary">Total Batch Cost</Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="success.main">
                      {Math.round(totalBatchCost).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
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
            Create Batch
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
