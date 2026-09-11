import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import api from '../api/client';

const VARIANTS = ['Modified', 'USA eSim', 'Canada', 'Mexican', 'Korea', 'Singapore', 'Bypass'];

const STATUS_CHOICES = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'WAITING_SHIPMENT', label: 'Waiting Shipment' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RETURNED', label: 'Returned' },
];

const AddDeviceDialog = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    imei: '',
    imei2: '',
    serial_number: '',
    model: '',
    capacity: '256GB',
    color: 'Natural Titanium',
    variant: 'Modified',
    current_status: 'IN_STOCK',
    current_owner: '',
    battery_health: '100',
    buying_price: '',
    notes: '',
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      api.get('/api/users/').then((res) => {
        setUsers(res.data?.results || res.data || []);
      }).catch(() => {});
    }
  }, [open]);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imei.trim()) {
      setError('Primary IMEI is required.');
      return;
    }
    if (!formData.model.trim()) {
      setError('Model name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        imei: formData.imei.trim(),
        imei2: formData.imei2.trim() || null,
        serial_number: formData.serial_number.trim() || null,
        model: formData.model.trim(),
        battery_health: formData.battery_health ? parseInt(formData.battery_health, 10) : null,
        buying_price: formData.buying_price ? parseFloat(formData.buying_price) : 0,
        current_owner: formData.current_owner ? parseInt(formData.current_owner, 10) : null,
      };

      await api.post('/api/devices/', payload);
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.imei?.[0] || err.response?.data?.error || 'Failed to register device.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>📱 Register Single Device</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2} sx={{ mt: 0.2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Primary IMEI *"
                fullWidth
                size="small"
                value={formData.imei}
                onChange={handleChange('imei')}
                placeholder="15-digit IMEI"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Secondary IMEI2"
                fullWidth
                size="small"
                value={formData.imei2}
                onChange={handleChange('imei2')}
                placeholder="eSIM IMEI"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Model Name *"
                fullWidth
                size="small"
                value={formData.model}
                onChange={handleChange('model')}
                placeholder="e.g. iPhone 15 Pro Max"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Serial Number"
                fullWidth
                size="small"
                value={formData.serial_number}
                onChange={handleChange('serial_number')}
                placeholder="e.g. F2LZW0..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Variant"
                fullWidth
                size="small"
                value={formData.variant}
                onChange={handleChange('variant')}
              >
                {VARIANTS.map((v) => (
                  <MenuItem key={v} value={v}>{v}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Status"
                fullWidth
                size="small"
                value={formData.current_status}
                onChange={handleChange('current_status')}
              >
                {STATUS_CHOICES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Capacity"
                fullWidth
                size="small"
                value={formData.capacity}
                onChange={handleChange('capacity')}
                placeholder="e.g. 256GB"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Color"
                fullWidth
                size="small"
                value={formData.color}
                onChange={handleChange('color')}
                placeholder="e.g. Natural Titanium"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Battery Health (%)"
                type="number"
                fullWidth
                size="small"
                value={formData.battery_health}
                onChange={handleChange('battery_health')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Total Buying Cost (BDT)"
                type="number"
                fullWidth
                size="small"
                value={formData.buying_price}
                onChange={handleChange('buying_price')}
                placeholder="0.00"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Assigned Owner / Holder"
                fullWidth
                size="small"
                value={formData.current_owner}
                onChange={handleChange('current_owner')}
              >
                <MenuItem value=""><em>None / Unassigned</em></MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.first_name ? `${u.first_name} (${u.username})` : u.username}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes / Remarks"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={formData.notes}
                onChange={handleChange('notes')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Registering...' : 'Register Device'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddDeviceDialog;
