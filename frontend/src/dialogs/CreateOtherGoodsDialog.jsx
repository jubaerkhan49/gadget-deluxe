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
  Paper,
  Chip
} from '@mui/material';
import {
  ShoppingBag as OrderIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as AddressIcon,
  AttachMoney as MoneyIcon,
  LocalShipping as ShippingIcon,
  TrendingUp as ProfitIcon,
  AccountBalance as BankIcon,
  Receipt as TrxIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { otherGoodsApi } from '../api/client';

const CATEGORY_OPTIONS = [
  { value: 'Laptop', label: 'Laptop & Notebooks' },
  { value: 'AirPods', label: 'AirPods & Audio' },
  { value: 'Gadgets', label: 'Smart Gadgets & Watches' },
  { value: 'Laptop Parts', label: 'Laptop & Computer Parts' },
  { value: 'Cosmetics', label: 'Cosmetics & Skincare' },
  { value: 'Accessories', label: 'Accessories & Cables' },
  { value: 'Other Goods', label: 'Other Custom Goods' }
];

const STAGE_OPTIONS = [
  { value: 'ORDER_CONFIRMED', label: '1. Order Confirmed' },
  { value: 'PAYMENT_RECEIVED', label: '2. Payment Made / Advance Paid' },
  { value: 'PRODUCT_PURCHASED', label: '3. Product Purchased' },
  { value: 'SHIPPED_TO_CN_WAREHOUSE', label: '4. Shipped to China Warehouse' },
  { value: 'RECEIVED_AT_CN_WAREHOUSE', label: '5. Received at CN Warehouse' },
  { value: 'SHIPPED_TO_BD', label: '6. Shipped to BD (In Transit)' },
  { value: 'ARRIVED_AT_BD', label: '7. Arrived at BD' },
  { value: 'RECEIVED_IN_BD', label: '8. Received in BD' },
  { value: 'DELIVERED', label: '9. Product Delivered' }
];

const PAYMENT_METHODS = [
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' }
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
    category: 'Laptop',
    product_description: '',
    buying_price: '',
    shipping_cost: '0.00',
    selling_price: '',
    payment_method: 'BKASH',
    transaction_id: '',
    payment_amount: '0.00',
    payment_date: todayStr,
    order_date: todayStr,
    stage: 'ORDER_CONFIRMED',
    tracking_notes: '',
    estimated_delivery: ''
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Live financial calculations
  const numBuying = parseFloat(formData.buying_price) || 0;
  const numShipping = parseFloat(formData.shipping_cost) || 0;
  const numSelling = parseFloat(formData.selling_price) || 0;
  const numPaid = parseFloat(formData.payment_amount) || 0;

  const totalCost = numBuying + numShipping;
  const profit = numSelling > 0 ? numSelling - totalCost : 0;
  const marginPct = numSelling > 0 ? ((profit / numSelling) * 100).toFixed(1) : '0.0';
  const billedTotal = numSelling > 0 ? numSelling : totalCost;
  const dueAmount = Math.max(0, billedTotal - numPaid);

  const isElectronicPayment = ['BKASH', 'NAGAD', 'BANK'].includes(formData.payment_method);

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
    if (!formData.buying_price || isNaN(formData.buying_price) || Number(formData.buying_price) < 0) {
      enqueueSnackbar('Valid Buying Price is required.', { variant: 'warning' });
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
        product_specs: formData.product_description.trim(),
        product_description: formData.product_description.trim(),
        buying_price: Number(formData.buying_price).toFixed(2),
        product_price: Number(formData.buying_price).toFixed(2),
        shipping_cost: (Number(formData.shipping_cost) || 0).toFixed(2),
        selling_price: (Number(formData.selling_price) || Number(formData.buying_price)).toFixed(2),
        payment_method: formData.payment_method,
        transaction_id: isElectronicPayment ? formData.transaction_id.trim() : '',
        payment_amount: (Number(formData.payment_amount) || 0).toFixed(2),
        payment_date: formData.payment_date || todayStr,
        order_date: formData.order_date || todayStr,
        stage: formData.stage,
        tracking_status: formData.stage,
        tracking_notes: formData.tracking_notes.trim(),
        estimated_delivery: formData.estimated_delivery || null,
        estimated_delivery_date: formData.estimated_delivery || null
      };

      const res = await otherGoodsApi.create(payload);
      enqueueSnackbar(`Order ${res.data.order_id} created successfully!`, { variant: 'success' });
      if (onOrderCreated) {
        onOrderCreated(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Error creating other goods order:', err);
      let errMsg = 'Failed to create order. Check inputs.';
      if (err.response?.data) {
        const d = err.response.data;
        if (typeof d === 'string') {
          errMsg = d;
        } else if (d.error || d.detail) {
          errMsg = d.error || d.detail;
        } else if (typeof d === 'object') {
          const firstKey = Object.keys(d)[0];
          const val = d[firstKey];
          errMsg = `${firstKey}: ${Array.isArray(val) ? val.join(', ') : val}`;
        }
      }
      enqueueSnackbar(errMsg, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)'
          }}
        >
          <OrderIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            New Custom Order ("Other Goods")
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Register single item purchase with cost, sold price, profit & payment method
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
              placeholder="e.g. Dell Latitude 7400 2-in-1 Screen Assembly"
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

          {/* Pricing, Cost & Profit */}
          <Grid item xs={12}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <MoneyIcon fontSize="small" /> Pricing, Cost & Profit
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Buying Price / Item Cost (BDT)"
              fullWidth
              required
              type="number"
              size="small"
              value={formData.buying_price}
              onChange={(e) => handleChange('buying_price', e.target.value)}
              placeholder="9625"
              helperText="Cost to buy product abroad"
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
              placeholder="1000"
              helperText="Estimated or confirmed logistics"
              InputProps={{
                startAdornment: <InputAdornment position="start">৳</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Selling Amount / Sold Price (BDT)"
              fullWidth
              required
              type="number"
              size="small"
              value={formData.selling_price}
              onChange={(e) => handleChange('selling_price', e.target.value)}
              placeholder="14000"
              helperText="Final price charged to customer"
              InputProps={{
                startAdornment: <InputAdornment position="start">৳</InputAdornment>
              }}
            />
          </Grid>

          {/* Live Profit & Calculation Card */}
          <Grid item xs={12}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
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
                  Total Cost (Buy + Ship)
                </Typography>
                <Typography variant="subtitle1" fontWeight={800} color="text.primary">
                  ৳ {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>

              <Divider orientation="vertical" flexItem />

              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">
                  Sold / Selling Price
                </Typography>
                <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                  ৳ {numSelling.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>

              <Divider orientation="vertical" flexItem />

              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">
                  Net Profit (Margin)
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight={900}
                  color={profit >= 0 ? 'success.main' : 'error.main'}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
                >
                  <ProfitIcon fontSize="small" />
                  ৳ {profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <Chip
                    label={`${marginPct}%`}
                    size="small"
                    color={profit >= 0 ? 'success' : 'error'}
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800, ml: 0.5, color: '#ffffff' }}
                  />
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
                  color={dueAmount > 0 ? 'error.main' : 'success.main'}
                >
                  ৳ {dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Payment Method & TrxID */}
          <Grid item xs={12}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BankIcon fontSize="small" /> Payment Method & Advance Paid
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Payment Method"
              select
              fullWidth
              size="small"
              value={formData.payment_method}
              onChange={(e) => handleChange('payment_method', e.target.value)}
            >
              {PAYMENT_METHODS.map((pm) => (
                <MenuItem key={pm.value} value={pm.value}>
                  {pm.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {isElectronicPayment ? (
            <Grid item xs={12} sm={4}>
              <TextField
                label={`TrxID / Transaction ID (${formData.payment_method === 'BKASH' ? 'bKash' : formData.payment_method === 'NAGAD' ? 'Nagad' : 'Bank Reference'})`}
                fullWidth
                size="small"
                value={formData.transaction_id}
                onChange={(e) => handleChange('transaction_id', e.target.value)}
                placeholder="e.g. 9K382HA92L or Bank Trx #"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TrxIcon fontSize="small" color="primary" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          ) : (
            <Grid item xs={12} sm={4}>
              <TextField
                label="Payment Note"
                fullWidth
                size="small"
                disabled
                value="Cash Received at Store"
              />
            </Grid>
          )}

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
              label="Estimated Delivery Date"
              type="date"
              fullWidth
              size="small"
              value={formData.estimated_delivery}
              onChange={(e) => handleChange('estimated_delivery', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Initial Tracking Note (Visible in Customer Portal)"
              fullWidth
              size="small"
              value={formData.tracking_notes}
              onChange={(e) => handleChange('tracking_notes', e.target.value)}
              placeholder="e.g. Sourcing from official China supplier."
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
          sx={{
            borderRadius: 2,
            px: 3,
            background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #DB2777 0%, #9D174D 100%)'
            }
          }}
        >
          {submitting ? 'Creating Order...' : 'Create Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
