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
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useSnackbar } from 'notistack';
import { deviceApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';

export default function MarkSoldDialog({ open, onClose, device, onSubmitted }) {
  const { enqueueSnackbar } = useSnackbar();
  const [proposedPrice, setProposedPrice] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && device) {
      setProposedPrice(device.selling_price ? String(device.selling_price) : '');
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('CASH');
      setNotes('');
    }
  }, [open, device]);

  if (!device) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        proposed_price: proposedPrice ? parseFloat(proposedPrice) : null,
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        payment_method: paymentMethod,
        notes: notes.trim() || null
      };

      await deviceApi.requestSale(device.id, payload);
      enqueueSnackbar(`Sale approval requested for ${device.model}! Status changed to Pending Sale.`, {
        variant: 'success'
      });
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit sale request';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'background.paper',
          p: 0.5
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, pt: 2, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: { xs: 34, sm: 40 },
              height: { xs: 34, sm: 40 },
              borderRadius: 2,
              bgcolor: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <PointOfSaleIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} letterSpacing="-0.3px" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Mark Device as Sold
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.68rem', sm: '0.75rem' } }}>
              Submit sale request for Administrator review & price confirmation
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={loading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
          {/* Device Summary Card */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2.5,
              borderRadius: 2,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC'),
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <SmartphoneIcon sx={{ color: 'primary.main', fontSize: 22 }} />
                <Typography variant="subtitle2" fontWeight={800}>
                  {device.model}
                </Typography>
              </Box>
              <StatusBadge status={device.current_status} />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 1 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontWeight: 600 }}>
                IMEI: {device.imei}
              </Typography>
              {device.variant && <VariantBadge variant={device.variant} />}
              {device.capacity && (
                <Typography variant="caption" color="text.secondary">
                  • {device.capacity}
                </Typography>
              )}
              {device.color && (
                <Typography variant="caption" color="text.secondary">
                  • {device.color}
                </Typography>
              )}
              {device.battery_health && (
                <Typography variant="caption" color="text.secondary">
                  • BH {device.battery_health}%
                </Typography>
              )}
            </Box>
          </Paper>

          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 1.5 }}>
            Once submitted, this device status will become <strong>Pending Sale</strong>. When Admin confirms the sale amount, the sale is finalized and the device will be moved out of your active custody.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Proposed / Selling Amount (BDT)"
                type="number"
                placeholder="e.g. 115000"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                helperText="Admin will verify or finalize the final sold amount"
                inputProps={{ min: 0, step: 'any' }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer Name (Optional)"
                placeholder="Buyer's full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Customer Phone (Optional)"
                placeholder="01XXXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="BANK">Bank Transfer</MenuItem>
                <MenuItem value="MOBILE">Mobile Banking (bKash / Nagad / Rocket)</MenuItem>
                <MenuItem value="CARD">Credit / Debit Card</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Sale Notes / Remarks (Optional)"
                placeholder="Any special remarks, accessories included, or customer warranty notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2.5 },
            pt: 1.5,
            display: 'flex',
            gap: 1.5,
            borderTop: 1,
            borderColor: 'divider'
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={loading}
            sx={{ borderRadius: 1.5, py: 0.9, textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            fullWidth
            type="submit"
            variant="contained"
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PointOfSaleIcon />}
            sx={{ borderRadius: 1.5, py: 0.9, fontWeight: 700, textTransform: 'none' }}
          >
            {loading ? 'Submitting...' : 'Submit Sale for Approval'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
