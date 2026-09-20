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
  Typography,
  Box,
  InputAdornment,
  Divider,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Chip,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  AttachMoney as MoneyIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenIcon,
  CheckCircle as CheckIcon,
  Timeline as TimelineIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  AccessTime as TimeIcon,
  TrendingUp as ProfitIcon,
  AccountBalance as BankIcon,
  Receipt as TrxIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { otherGoodsApi } from '../api/client';

export const TRACKING_STAGES = [
  { id: 'ORDER_CONFIRMED', label: 'Order Confirmed', step: 0 },
  { id: 'PAYMENT_RECEIVED', label: 'Payment Made', step: 1 },
  { id: 'PRODUCT_PURCHASED', label: 'Product Purchased', step: 2 },
  { id: 'SHIPPED_TO_CN_WAREHOUSE', label: 'Shipped (CN Warehouse)', step: 3 },
  { id: 'SHIPPED_TO_BD', label: 'Shipped to BD', step: 4 },
  { id: 'ARRIVED_AT_BD', label: 'Arrived at BD', step: 5 },
  { id: 'RECEIVED_IN_BD', label: 'Received in BD', step: 6 },
  { id: 'DELIVERED', label: 'Product Delivered', step: 7 }
];

const PAYMENT_METHODS = [
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' }
];

export default function UpdateOrderTrackingDialog({ open, onClose, order, onOrderUpdated }) {
  const { enqueueSnackbar } = useSnackbar();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    stage: 'ORDER_CONFIRMED',
    buying_price: '0.00',
    shipping_cost: '0.00',
    selling_price: '0.00',
    payment_method: 'BKASH',
    transaction_id: '',
    payment_amount: '0.00',
    payment_date: '',
    tracking_notes: '',
    estimated_delivery: '',
    actual_delivery: '',
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    product_name: '',
    product_description: ''
  });

  useEffect(() => {
    if (order) {
      setFormData({
        stage: order.stage || order.tracking_status || 'ORDER_CONFIRMED',
        buying_price: order.buying_price || order.product_price || '0.00',
        shipping_cost: order.shipping_cost || '0.00',
        selling_price: order.selling_price || order.total_amount || order.buying_price || '0.00',
        payment_method: order.payment_method || 'BKASH',
        transaction_id: order.transaction_id || '',
        payment_amount: order.payment_amount || '0.00',
        payment_date: order.payment_date || '',
        tracking_notes: order.tracking_notes || '',
        estimated_delivery: order.estimated_delivery || order.estimated_delivery_date || '',
        actual_delivery: order.actual_delivery || order.actual_delivery_date || '',
        customer_name: order.customer_name || '',
        customer_phone: order.customer_phone || '',
        customer_address: order.customer_address || '',
        product_name: order.product_name || '',
        product_description: order.product_description || order.product_specs || ''
      });
    }
  }, [order, open]);

  if (!order) return null;

  const currentStepIndex = TRACKING_STAGES.findIndex((s) => s.id === formData.stage);

  // Financial calculations
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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStepClick = (stageId) => {
    handleChange('stage', stageId);
    if (stageId === 'DELIVERED' && !formData.actual_delivery) {
      handleChange('actual_delivery', new Date().toISOString().split('T')[0]);
    }
  };

  const copyTrackingLink = () => {
    const trackingUrl = `${window.location.origin}/track?order=${encodeURIComponent(order.order_id)}`;
    navigator.clipboard.writeText(trackingUrl);
    enqueueSnackbar(`Tracking Link copied: ${trackingUrl}`, { variant: 'success' });
  };

  const openCustomerPortal = () => {
    const trackingUrl = `${window.location.origin}/track?order=${encodeURIComponent(order.order_id)}`;
    window.open(trackingUrl, '_blank');
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const payload = {
        stage: formData.stage,
        tracking_status: formData.stage,
        buying_price: Number(formData.buying_price).toFixed(2),
        product_price: Number(formData.buying_price).toFixed(2),
        shipping_cost: Number(formData.shipping_cost).toFixed(2),
        selling_price: Number(formData.selling_price).toFixed(2),
        payment_method: formData.payment_method,
        transaction_id: isElectronicPayment ? formData.transaction_id.trim() : '',
        payment_amount: Number(formData.payment_amount).toFixed(2),
        payment_date: formData.payment_date || null,
        tracking_notes: formData.tracking_notes.trim(),
        estimated_delivery: formData.estimated_delivery || null,
        estimated_delivery_date: formData.estimated_delivery || null,
        actual_delivery: formData.actual_delivery || null,
        actual_delivery_date: formData.actual_delivery || null,
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim(),
        customer_address: formData.customer_address.trim(),
        product_name: formData.product_name.trim(),
        product_description: formData.product_description.trim(),
        product_specs: formData.product_description.trim()
      };

      const res = await otherGoodsApi.update(order.id, payload);
      enqueueSnackbar(`Order ${order.order_id} updated successfully!`, { variant: 'success' });
      if (onOrderUpdated) {
        onOrderUpdated(res.data);
      }
      onClose();
    } catch (err) {
      console.error('Error updating order:', err);
      enqueueSnackbar(err.response?.data?.error || err.response?.data?.detail || 'Failed to update order.', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const timelineEvents = order.timeline_events || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
            }}
          >
            <ShippingIcon fontSize="small" />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" fontWeight={800}>
                {order.order_id}
              </Typography>
              <Chip
                label={order.category_display || order.category}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: '0.75rem' }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {order.product_name} • {order.customer_name} ({order.customer_phone})
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<CopyIcon fontSize="small" />}
            onClick={copyTrackingLink}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Copy Tracking Link
          </Button>
          <Button
            size="small"
            variant="contained"
            color="info"
            startIcon={<OpenIcon fontSize="small" />}
            onClick={openCustomerPortal}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Customer View
          </Button>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ py: 2.5 }}>
        {/* 8-Stage Visual Stepper */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShippingIcon fontSize="small" /> Update 8-Stage Tracking Pipeline (Click a step to select)
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.9)'),
              overflowX: 'auto'
            }}
          >
            <Stepper nonLinear activeStep={currentStepIndex} alternativeLabel sx={{ minWidth: 650 }}>
              {TRACKING_STAGES.map((st, idx) => (
                <Step key={st.id} completed={idx < currentStepIndex}>
                  <StepButton onClick={() => handleStepClick(st.id)}>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          '&.Mui-active': { color: '#3B82F6' },
                          '&.Mui-completed': { color: '#10B981' }
                        }
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: idx === currentStepIndex ? 800 : 600,
                          color: idx === currentStepIndex ? 'primary.main' : 'text.secondary',
                          fontSize: '0.75rem',
                          display: 'block'
                        }}
                      >
                        {st.label}
                      </Typography>
                    </StepLabel>
                  </StepButton>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Box>

        <Grid container spacing={2.5}>
          {/* Tracking Status Note */}
          <Grid item xs={12}>
            <TextField
              label="Tracking Status Note / Update (Visible to Customer in Portal)"
              fullWidth
              size="small"
              value={formData.tracking_notes}
              onChange={(e) => handleChange('tracking_notes', e.target.value)}
              placeholder="e.g. Received at BD sorting hub. Weight verified."
            />
          </Grid>

          {/* Pricing, Sold Amount & Profit */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MoneyIcon fontSize="small" /> Pricing, Sold Price & Profit Management
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Buying Price / Cost (BDT)"
              fullWidth
              type="number"
              size="small"
              value={formData.buying_price}
              onChange={(e) => handleChange('buying_price', e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
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
              helperText="Update upon arrival in BD"
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Selling Amount / Sold Price (BDT)"
              fullWidth
              type="number"
              size="small"
              value={formData.selling_price}
              onChange={(e) => handleChange('selling_price', e.target.value)}
              helperText="Total customer bill"
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
            />
          </Grid>

          {/* Live Profit Calculation Card */}
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
                  Sold Amount
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
                    sx={{ height: 20, fontSize: '0.7rem', fontWeight: 800, ml: 0.5 }}
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
                  fontWeight={900}
                  color={dueAmount > 0 ? 'error.main' : 'success.main'}
                >
                  {dueAmount > 0
                    ? `৳ ${dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                    : 'PAID IN FULL'}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Payment Method & TrxID */}
          <Grid item xs={12}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BankIcon fontSize="small" /> Payment Method & Collection
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
                label={`TrxID / Ref (${formData.payment_method === 'BKASH' ? 'bKash' : formData.payment_method === 'NAGAD' ? 'Nagad' : 'Bank Reference'})`}
                fullWidth
                size="small"
                value={formData.transaction_id}
                onChange={(e) => handleChange('transaction_id', e.target.value)}
                placeholder="e.g. 9K382HA92L"
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
              label="Paid Amount So Far (BDT)"
              fullWidth
              type="number"
              size="small"
              value={formData.payment_amount}
              onChange={(e) => handleChange('payment_amount', e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
            />
          </Grid>

          {/* Dates */}
          <Grid item xs={12} sm={4}>
            <TextField
              label="Payment Date"
              type="date"
              fullWidth
              size="small"
              value={formData.payment_date || ''}
              onChange={(e) => handleChange('payment_date', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Est. Delivery Date"
              type="date"
              fullWidth
              size="small"
              value={formData.estimated_delivery || ''}
              onChange={(e) => handleChange('estimated_delivery', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Actual Delivery Date"
              type="date"
              fullWidth
              size="small"
              value={formData.actual_delivery || ''}
              onChange={(e) => handleChange('actual_delivery', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Customer & Product Details Editable */}
          <Grid item xs={12}>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon fontSize="small" /> Customer & Product Details
            </Typography>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Customer Name"
              fullWidth
              size="small"
              value={formData.customer_name}
              onChange={(e) => handleChange('customer_name', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Customer Phone"
              fullWidth
              size="small"
              value={formData.customer_phone}
              onChange={(e) => handleChange('customer_phone', e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              label="Product Name"
              fullWidth
              size="small"
              value={formData.product_name}
              onChange={(e) => handleChange('product_name', e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Customer Address"
              fullWidth
              size="small"
              value={formData.customer_address}
              onChange={(e) => handleChange('customer_address', e.target.value)}
            />
          </Grid>

          {/* Timeline History log */}
          {timelineEvents.length > 0 && (
            <Grid item xs={12}>
              <Divider sx={{ my: 0.5 }} />
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon fontSize="small" /> Timeline History ({timelineEvents.length} updates)
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  maxHeight: 160,
                  overflowY: 'auto',
                  bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.5)')
                }}
              >
                <List dense disablePadding>
                  {timelineEvents.map((evt, i) => (
                    <ListItem key={i} disableGutters sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 28, color: 'primary.main' }}>
                        <TimeIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={600} fontSize="0.8rem">
                            {evt.stage_display || evt.stage} • {evt.note}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                            {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : ''}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          )}
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
          startIcon={<CheckIcon />}
          sx={{
            borderRadius: 2,
            px: 3,
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
          }}
        >
          {submitting ? 'Saving...' : 'Save Updates'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
