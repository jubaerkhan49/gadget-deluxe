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
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          bgcolor: 'background.paper',
          p: 0,
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2.5, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <PointOfSaleIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} letterSpacing="-0.3px" sx={{ fontSize: '1.15rem' }}>
                Mark Device as Sold
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.76rem', display: 'block' }}>
                Submit sale for Admin review & price confirmation
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose} disabled={loading} sx={{ mt: -0.5, mr: -0.5, color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, py: 1.5 }}>
          {/* Device Summary Card */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.8,
              mb: 2,
              borderRadius: 2,
              bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC'),
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 0.8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SmartphoneIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="subtitle2" fontWeight={800}>
                  {device.model}
                </Typography>
              </Box>
              <StatusBadge status={device.current_status} />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, alignItems: 'center', mt: 0.5 }}>
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

          <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, py: 0.5, fontSize: '0.76rem', lineHeight: 1.4, '& .MuiAlert-message': { py: 0.2 } }}>
            Once submitted, device status changes to <strong>Pending Sale</strong> until Admin confirms the final selling amount.
          </Alert>

          <Stack spacing={1.8}>
            <TextField
              fullWidth
              size="small"
              label="Selling Amount (BDT)"
              type="number"
              placeholder="e.g. 115000"
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
              helperText="Admin will verify and confirm final sold price"
              inputProps={{ min: 0, step: 'any' }}
            />

            <TextField
              fullWidth
              size="small"
              label="Customer Name (Optional)"
              placeholder="Buyer's full name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <TextField
              fullWidth
              size="small"
              label="Customer Phone (Optional)"
              placeholder="01XXXXXXXXX"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />

            <TextField
              fullWidth
              size="small"
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

            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="Sale Notes (Optional)"
              placeholder="Special remarks, accessories included, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
            pt: 1.5,
            display: 'flex',
            gap: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={loading}
            sx={{
              flex: 1,
              height: 40,
              borderRadius: 1.75,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="success"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PointOfSaleIcon sx={{ fontSize: '18px !important' }} />}
            sx={{
              flex: 1.4,
              height: 40,
              borderRadius: 1.75,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.82rem',
              whiteSpace: 'nowrap',
              boxShadow: 'none'
            }}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
