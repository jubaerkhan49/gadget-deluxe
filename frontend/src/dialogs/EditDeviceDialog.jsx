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
  Alert,
} from '@mui/material';
import api from '../api/client';

const VARIANTS = ['Modified', 'USA eSim', 'Canada', 'Mexican', 'Korea', 'Singapore', 'Bypass'];

export default function EditDeviceDialog({ open, device, onClose, onDeviceUpdated, onSuccess }) {
  const [formData, setFormData] = useState({
    model: '',
    variant: '',
    capacity: '',
    color: '',
    battery_health: '',
    battery_cycle: '',
    buying_price: '',
    current_owner: '',
    notes: '',
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (device) {
      setFormData({
        model: device.model || '',
        variant: device.variant || 'Modified',
        capacity: device.capacity || '',
        color: device.color || '',
        battery_health: device.battery_health !== null && device.battery_health !== undefined ? `${device.battery_health}` : '',
        battery_cycle: device.battery_cycle !== null && device.battery_cycle !== undefined ? `${device.battery_cycle}` : '',
        buying_price: device.buying_price !== null && device.buying_price !== undefined ? `${device.buying_price}` : '',
        current_owner: device.current_owner || '',
        notes: device.notes || '',
      });
      api.get('/api/users/').then((res) => {
        setUsers(res.data?.results || res.data || []);
      }).catch(() => {});
    }
  }, [device]);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        model: formData.model.trim(),
        variant: formData.variant,
        capacity: formData.capacity.trim() || null,
        color: formData.color.trim() || null,
        battery_health: formData.battery_health ? parseInt(formData.battery_health, 10) : null,
        battery_cycle: formData.battery_cycle ? parseInt(formData.battery_cycle, 10) : null,
        buying_price: formData.buying_price ? parseFloat(formData.buying_price) : 0,
        current_owner: formData.current_owner ? parseInt(formData.current_owner, 10) : null,
        notes: formData.notes.trim() || null,
      };

      const res = await api.patch(`/api/devices/${device.id}/`, payload);
      if (onDeviceUpdated) onDeviceUpdated(res.data);
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Failed to update device.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>✏️ Edit Device Specs</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2} sx={{ mt: 0.2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Model Name *"
                fullWidth
                size="small"
                value={formData.model}
                onChange={handleChange('model')}
                required
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
                label="Capacity"
                fullWidth
                size="small"
                value={formData.capacity}
                onChange={handleChange('capacity')}
                placeholder="256GB"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Color"
                fullWidth
                size="small"
                value={formData.color}
                onChange={handleChange('color')}
                placeholder="Natural Titanium"
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
                placeholder="e.g. 98"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Cycle Count (CC)"
                type="number"
                fullWidth
                size="small"
                value={formData.battery_cycle}
                onChange={handleChange('battery_cycle')}
                placeholder="e.g. 250"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Buying Price (BDT)"
                type="number"
                fullWidth
                size="small"
                value={formData.buying_price}
                onChange={handleChange('buying_price')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Current Owner"
                fullWidth
                size="small"
                value={formData.current_owner}
                onChange={handleChange('current_owner')}
              >
                <MenuItem value=""><em>None (Unassigned)</em></MenuItem>
                {users
                  .filter((u) => u.username?.toLowerCase() !== 'admin')
                  .map((u) => {
                    const roleDisplay = u.username?.toLowerCase() === 'jubaer' || u.role === 'ADMIN' ? 'Admin' : 'Employee';
                    return (
                      <MenuItem key={u.id} value={u.id}>
                        {u.username} ({roleDisplay})
                      </MenuItem>
                    );
                  })}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
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
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
