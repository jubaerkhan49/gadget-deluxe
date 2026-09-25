import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Grid,
  MenuItem,
  CircularProgress,
  Paper,
  Alert,
  Divider,
  Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useSnackbar } from 'notistack';
import { deviceSaleRequestApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import { formatNumber } from '../utils/formatters';

export default function ConfirmSaleApprovalDialog({
  open,
  onClose,
  saleRequest,
  onApproved
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [soldAmount, setSoldAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [commission, setCommission] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && saleRequest) {
      setSoldAmount(
        saleRequest.proposed_price
          ? String(saleRequest.proposed_price)
          : saleRequest.device_selling_price
            ? String(saleRequest.device_selling_price)
            : ''
      );
      setCustomerName(saleRequest.customer_name || '');
      setCustomerPhone(saleRequest.customer_phone || '');
      setPaymentMethod(saleRequest.payment_method || 'CASH');
      setCommission('0');
      setDiscount('0');
      setReviewNotes('');
    }
  }, [open, saleRequest]);

  if (!saleRequest) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!soldAmount || parseFloat(soldAmount) <= 0) {
      enqueueSnackbar('Please enter a valid Sold Amount (Selling Price).', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        selling_price: parseFloat(soldAmount),
        confirmed_price: parseFloat(soldAmount),
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        payment_method: paymentMethod,
        commission_amount: commission ? parseFloat(commission) : 0,
        discount: discount ? parseFloat(discount) : 0,
        review_notes: reviewNotes.trim() || null
      };

      const res = await deviceSaleRequestApi.approve(saleRequest.id, payload);
      enqueueSnackbar(res.data.message || `Sale confirmed for BDT ${soldAmount}! Device is marked as Sold.`, {
        variant: 'success'
      });
      if (onApproved) onApproved(res.data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to approve sale request';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const buyingPriceNum = parseFloat(saleRequest.device_buying_price || 0);
  const soldAmountNum = parseFloat(soldAmount || 0);
  const discountNum = parseFloat(discount || 0);
  const commissionNum = parseFloat(commission || 0);
  const estimatedProfit = soldAmountNum - buyingPriceNum - discountNum - commissionNum;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: 'background.paper',
          p: 0.5
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, pt: 2, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircleIcon fontSize="medium" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.3px">
              Confirm Sold & Finalize Sale
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Review sale request, set final sold price, and create invoice
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={loading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, py: 1.5 }}>
          {/* Device & Seller Summary Card */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: 2.5,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC'),
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <SmartphoneIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                <Typography variant="subtitle2" fontWeight={800}>
                  {saleRequest.device_model || 'Device'}
                </Typography>
              </Box>
              <Chip
                label={`Sold by @${saleRequest.employee_username}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700, height: 24 }}
              />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 1 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontWeight: 600 }}>
                IMEI: {saleRequest.device_imei}
              </Typography>
              {saleRequest.device_variant && <VariantBadge variant={saleRequest.device_variant} />}
              {saleRequest.device_capacity && (
                <Typography variant="caption" color="text.secondary">
                  • {saleRequest.device_capacity}
                </Typography>
              )}
              {saleRequest.device_color && (
                <Typography variant="caption" color="text.secondary">
                  • {saleRequest.device_color}
                </Typography>
              )}
              {saleRequest.device_battery_health && (
                <Typography variant="caption" color="text.secondary">
                  • BH {saleRequest.device_battery_health}%
                </Typography>
              )}
              {buyingPriceNum > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  • Cost: BDT {formatNumber(buyingPriceNum)}
                </Typography>
              )}
            </Box>

            {saleRequest.proposed_price && (
              <Box sx={{ mt: 1.2, pt: 1, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  Employee Proposed Price:
                </Typography>
                <Typography variant="caption" fontWeight={700} color="warning.main">
                  BDT {formatNumber(saleRequest.proposed_price)}
                </Typography>
              </Box>
            )}

            {saleRequest.notes && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.8, fontStyle: 'italic' }}>
                "{saleRequest.notes}"
              </Typography>
            )}
          </Paper>

          <Grid container spacing={2}>
            {/* Required Sold Amount */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                autoFocus
                label="Final Sold Amount (BDT)"
                type="number"
                placeholder="Enter sold amount in BDT"
                value={soldAmount}
                onChange={(e) => setSoldAmount(e.target.value)}
                helperText={
                  soldAmountNum > 0
                    ? `Estimated Gross Profit: BDT ${formatNumber(estimatedProfit)}`
                    : 'Enter the exact final amount received for this device sale'
                }
                inputProps={{ min: 0, step: 'any' }}
                InputProps={{
                  startAdornment: (
                    <Typography variant="body2" sx={{ mr: 1, fontWeight: 700, color: 'text.secondary' }}>
                      BDT
                    </Typography>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer Name"
                placeholder="Buyer's full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer Phone"
                placeholder="01XXXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="BANK">Bank Transfer</MenuItem>
                <MenuItem value="MOBILE">Mobile Banking (bKash/Nagad/Rocket)</MenuItem>
                <MenuItem value="CARD">Credit / Debit Card</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Staff Commission (BDT)"
                type="number"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                inputProps={{ min: 0, step: 'any' }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Approval / Invoice Notes"
                placeholder="Admin approval remarks or invoice note..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={loading || !soldAmount || parseFloat(soldAmount) <= 0}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            sx={{ px: 2.5, fontWeight: 700 }}
          >
            {loading ? 'Confirming Sale...' : 'Confirm as Sold & Create Invoice'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
