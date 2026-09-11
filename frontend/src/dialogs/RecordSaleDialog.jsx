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
  Paper,
  Box,
  Divider,
  CircularProgress,
  Autocomplete,
  Stack,
  Chip
} from '@mui/material';
import {
  PointOfSale as SaleIcon,
  CheckCircleOutline as CheckIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi, saleApi, customerApi, userApi } from '../api/client';

export default function RecordSaleDialog({ open, onClose, onSaleRecorded, initialDevice = null }) {
  const { enqueueSnackbar } = useSnackbar();
  const [devices, setDevices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      fetchInitialData();
    }
  }, [open]);

  useEffect(() => {
    if (initialDevice) {
      setSelectedDevice(initialDevice);
      if (initialDevice.current_owner) {
        setSellerId(initialDevice.current_owner);
      }
    }
  }, [initialDevice, open]);

  const fetchInitialData = async () => {
    try {
      setLoadingInitial(true);
      const [devRes, custRes, userRes] = await Promise.all([
        deviceApi.getAll(),
        customerApi.getAll(),
        userApi.getAll()
      ]);
      const allDevs = devRes.data.results || devRes.data || [];
      // Prefer devices not already sold
      setDevices(allDevs.filter((d) => d.current_status !== 'SOLD'));
      setCustomers(custRes.data.results || custRes.data || []);
      const userList = userRes.data.results || userRes.data || [];
      setUsers(userList);
      if (userList.length > 0 && !sellerId) {
        setSellerId(userList[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const buyingCost = selectedDevice?.buying_price ? parseFloat(selectedDevice.buying_price) : 0;
  const sellPriceNum = parseFloat(sellingPrice) || 0;
  const discountNum = parseFloat(discount) || 0;
  const netSellingPrice = Math.max(sellPriceNum - discountNum, 0);
  const estimatedProfit = netSellingPrice - buyingCost;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDevice) {
      enqueueSnackbar('Please select a device to sell', { variant: 'error' });
      return;
    }
    if (!sellingPrice || sellPriceNum <= 0) {
      enqueueSnackbar('Please enter a valid selling price', { variant: 'error' });
      return;
    }

    try {
      setSaving(true);
      
      // If customer is provided, find or create
      let custId = null;
      if (customerName.trim()) {
        const existing = customers.find(
          (c) => c.name.toLowerCase() === customerName.trim().toLowerCase()
        );
        if (existing) {
          custId = existing.id;
        } else {
          try {
            const newCustRes = await customerApi.create({
              name: customerName.trim(),
              phone: customerPhone.trim() || undefined
            });
            custId = newCustRes.data.id;
          } catch (cErr) {
            console.error('Failed to create customer record', cErr);
          }
        }
      }

      const payload = {
        device: selectedDevice.id,
        customer: custId,
        seller: sellerId || null,
        buying_price: buyingCost,
        selling_price: sellPriceNum,
        discount: discountNum,
        payment_method: paymentMethod,
        payment_status: 'PAID',
        notes: notes.trim() || null
      };

      const res = await saleApi.create(payload);
      
      // Ensure device status becomes SOLD
      await deviceApi.update(selectedDevice.id, {
        current_status: 'SOLD',
        selling_price: sellPriceNum
      });

      enqueueSnackbar(`Sale recorded! Invoice: ${res.data.invoice_number || 'Generated'}`, {
        variant: 'success'
      });

      if (onSaleRecorded) onSaleRecorded(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.detail || 'Failed to record sale', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <SaleIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Record New Sale / Invoice
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {/* Device Selector */}
            <Grid item xs={12}>
              <Autocomplete
                options={devices}
                getOptionLabel={(option) =>
                  `${option.model} (${option.variant || 'Standard'}) - IMEI: ${option.imei} [Cost: ${Math.round(Number(option.buying_price || 0)).toLocaleString()}]`
                }
                value={selectedDevice}
                onChange={(event, newValue) => {
                  setSelectedDevice(newValue);
                  if (newValue?.current_owner) {
                    setSellerId(newValue.current_owner);
                  }
                }}
                loading={loadingInitial}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="Select Device to Sell"
                    placeholder="Search by model or IMEI..."
                    size="small"
                  />
                )}
              />
            </Grid>

            {/* Pricing Details */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                size="small"
                type="number"
                label="Selling Price"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="e.g. 115000"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Discount Amount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
              />
            </Grid>

            {/* Customer Information */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Customer Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Customer Phone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="017xxxxxxxx"
              />
            </Grid>

            {/* Seller & Payment */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Sold By (Seller)"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.username}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Payment Method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="CASH">Cash</MenuItem>
                <MenuItem value="BKASH">bKash</MenuItem>
                <MenuItem value="NAGAD">Nagad</MenuItem>
                <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
                <MenuItem value="CARD">Credit/Debit Card</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Sale Notes / Warranty Memo"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Grid>

            {/* Live Profit Preview */}
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
                <Grid container spacing={1.5} alignItems="center">
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Buying Cost</Typography>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {Math.round(buyingCost).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Net Sale</Typography>
                    <Typography variant="subtitle1" fontWeight={700} color="primary">
                      {Math.round(netSellingPrice).toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Gross Profit</Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color={estimatedProfit >= 0 ? "success.main" : "error.main"}
                    >
                      {Math.round(estimatedProfit).toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
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
            disabled={saving || !selectedDevice}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
          >
            Generate Invoice
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
