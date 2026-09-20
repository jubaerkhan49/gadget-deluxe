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
  Box,
  InputAdornment,
  Divider,
  Paper
} from '@mui/material';
import {
  ShoppingBag as OrderIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as AddressIcon,
  AttachMoney as MoneyIcon,
  LocalShipping as ShippingIcon,
  CalendarToday as DateIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { otherGoodsApi } from '../api/client';

const CATEGORY_OPTIONS = [
  { value: 'LAPTOP', label: 'Laptop & Notebooks' },
  { value: 'AIRPODS', label: 'AirPods & Audio' },
  { value: 'GADGETS', label: 'Smart Gadgets & Watches' },
  { value: 'LAPTOP_PARTS', label: 'Laptop & Computer Parts' },
  { value: 'COSMETICS', label: 'Cosmetics & Skincare' },
  { value: 'ACCESSORIES', label: 'Accessories & Cables' },
  { value: 'OTHER', label: 'Other Custom Goods' }
];

const STAGE_OPTIONS = [
  { value: 'ORDER_CONFIRMED', label: '1. Order Confirmed' },
  { value: 'PAYMENT_RECEIVED', label: '2. Payment Made / Advance Paid' },
  { value: 'PRODUCT_PURCHASED', label: '3. Product Purchased' },
  { value: 'SHIPPED_TO_CN_WAREHOUSE', label: '4. Shipped to China Warehouse' },
  { value: 'SHIPPED_TO_BD', label: '5. Shipped to BD (In Transit)' },
  { value: 'ARRIVED_AT_BD', label: '6. Arrived at BD' },
  { value: 'RECEIVED_IN_BD', label: '7. Received in BD' },
  { value: 'DELIVERED', label: '8. Product Delivered' }
];

export default function CreateOtherGoodsDialog({ open, onClose, onOrderCreated }) {
  const { enqueueSnackbar } = useSnackbar();
  const [submitting, setSubmitting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    product_name: '',
    category: 'LAPTOP',
    product_description: '',
    product_price: '',
    shipping_cost: '0.00',
    order_date: todayStr,
    stage: 'ORDER_CONFIRMED',
    payment_amount: '0.00',
    payment_date: todayStr,
    payment_reference: '',
    tracking_notes: '',
    estimated_delivery: ''
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Live calculations
  const numPrice = parseFloat(formData.product_price) || 0;
  const numShipping = parseFloat(formData.shipping_cost) || 0;
  const numPaid = parseFloat(formData.payment_amount) || 0;
  const totalAmount = numPrice + numShipping;
  const dueAmount = Math.max(0, totalAmount - numPaid);

  const handleSubmit = async (e) => {
    e?.preventDefault();

    if (!formData.customer_name.trim()) {
      enqueueSnackbar('Customer Name is required.', { variant: 'warning' });
      return;
    }
    if (!formData.customer_phone.trim()) {
      enqueueSnackbar('Customer Phone is required.', { variant: 'warning' });
      return;
    }
    if (!formData.product_name.trim()) {
      enqueueSnackbar('Product Name is required.', { variant: 'warning' });
      return;
    }
    if (!formData.product_price || isNaN(formData.product_price) || Number(formData.product_price) < 0) {
      enqueueSnackbar('Valid Product Price is required.', { variant: 'warning' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim(),
        customer_address: formData.customer_address.trim(),
        product_name: formData.product_name.trim(),
        category: formData.category,
        product_description: formData.product_description.trim(),
        product_price: Number(formData.product_price).toFixed(2),
        shipping_cost: (Number(formData.shipping_cost) || 0).toFixed(2),
        order_date: formData.order_date || todayStr,
        stage: formData.stage,
        payment_amount: (Number(formData.payment_amount) || 0).toFixed(2),
        payment_date: formData.payment_date || todayStr,
        payment_reference: formData.payment_reference.trim(),
        tracking_notes: formData.tracking_notes.trim(),
        estimated_delivery: formData.estimated_delivery || null
      };

      const res = await otherGoodsApi.create(payload);
      enqueueSnackbar(`Order ${res.data.order_id} created successfully!`, { variant: 'success' });
      if (onOrderCreated) {
        onOrderCreated(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Error creating other goods order:', err);
      enqueueSnackbar(err.response?.data?.error || err.response?.data?.detail || 'Failed to create order. Check inputs.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}
        >
          <OrderIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            New Custom Order ("Other Goods")
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Register single item purchase (Laptops, AirPods, Gadgets, Cosmetics, etc.)
          </Typography>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2.5 }}>
        <Grid container spacing={2.5}>
          {/* Customer Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" /> Customer Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Customer Name"
              fullWidth
              required
              size="small"
              value={formData.customer_name}
              onChange={(e) => handleChange('customer_name', e.target.value)}
              placeholder="e.g. Tanvir Ahmed"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" color="action" />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Customer Phone"
              fullWidth
              required
              size="small"
              value={formData.customer_phone}
              onChange={(e) => handleChange('customer_phone', e.target.value)}
              placeholder="e.g. 01711223344"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon fontSize="small" color="action" />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Delivery Address"
              fullWidth
              size="small"
              value={formData.customer_address}
              onChange={(e) => handleChange('customer_address', e.target.value)}
              placeholder="House #, Road #, Area, District"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AddressIcon fontSize="small" color="action" />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          {/* Product Details */}
          <Grid item xs={12}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <OrderIcon fontSize="small" /> Product & Category Details
            </Typography>
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              label="Product Name"
              fullWidth
              required
              size="small"
              value={formData.product_name}
              onChange={(e) => handleChange('product_name', e.target.value)}
              placeholder="e.g. MacBook Pro M3 14-inch 16GB / 512GB Space Black"
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Category"
              select
              fullWidth
              size="small"
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Product Specs / Color / Model Specs / Notes"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={formData.product_description}
              onChange={(e) => handleChange('product_description', e.target.value)}
              placeholder="Specs, variant, serial/SN if known, model numbers or custom requests..."
            />
          </Grid>

          {/* Pricing & Logistics */}
          <Grid item xs={12}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MoneyIcon fontSize="small" /> Pricing & Advance Payment
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Product Price (BDT)"
              fullWidth
              required
              type="number"
              size="small"
              value={formData.product_price}
              onChange={(e) => handleChange('product_price', e.target.value)}
              placeholder="15000"
              InputProps={{
                startAdornment: <InputAdornment position="start">৳</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Shipping Cost (BDT)"
              fullWidth
              type="number"
              size="small"
              value={formData.shipping_cost}
              onChange={(e) => handleChange('shipping_cost', e.target.value)}
              placeholder="0.00"
              helperText="Can be updated when received in BD"
              InputProps={{
                startAdornment: <InputAdornment position="start">৳</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Advance / Paid Amount (BDT)"
              fullWidth
              type="number"
              size="small"
              value={formData.payment_amount}
              onChange={(e) => handleChange('payment_amount', e.target.value)}
              placeholder="10000"
              helperText="Customer payment so far"
              InputProps={{
                startAdornment: <InputAdornment position="start">৳</InputAdornment>
              }}
            />
          </Grid>

          {/* Live Calculation Card */}
          <Grid item xs={12}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.7)' : 'rgba(241, 245, 249, 0.8)'),
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">
                  Total Order Value
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary.main">
                  ৳ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>

              <Divider orientation="vertical" flexItem />

              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">
                  Paid So Far
                </Typography>
                <Typography variant="h6" fontWeight={800} color="success.main">
                  ৳ {numPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>

              <Divider orientation="vertical" flexItem />

              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">
                  Remaining Due
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={800}
                  color={dueAmount > 0 ? 'error.main' : 'text.secondary'}
                >
                  ৳ {dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Tracking Pipeline Initial Stage */}
          <Grid item xs={12}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShippingIcon fontSize="small" /> Initial Tracking Stage & Dates
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Initial Tracking Stage"
              select
              fullWidth
              size="small"
              value={formData.stage}
              onChange={(e) => handleChange('stage', e.target.value)}
            >
              {STAGE_OPTIONS.map((st) => (
                <MenuItem key={st.value} value={st.value}>
                  {st.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Order Date"
              type="date"
              fullWidth
              size="small"
              value={formData.order_date}
              onChange={(e) => handleChange('order_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Payment Reference / TrxID / Method"
              fullWidth
              size="small"
              value={formData.payment_reference}
              onChange={(e) => handleChange('payment_reference', e.target.value)}
              placeholder="e.g. Bkash Trx 9K382HA, Bank Transfer, Cash"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Estimated Delivery Date"
              type="date"
              fullWidth
              size="small"
              value={formData.estimated_delivery}
              onChange={(e) => handleChange('estimated_delivery', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Initial Tracking Note (Visible to Customer in Portal)"
              fullWidth
              size="small"
              value={formData.tracking_notes}
              onChange={(e) => handleChange('tracking_notes', e.target.value)}
              placeholder="e.g. Advance paid 10,000 BDT. Sourcing from official China supplier."
            />
          </Grid>
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          startIcon={<OrderIcon />}
          sx={{ borderRadius: 2, px: 3 }}
        >
          {submitting ? 'Creating Order...' : 'Create Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
