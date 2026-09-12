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
  IconButton,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  EditOutlined as EditIcon,
  Close as CloseIcon,
  Save as SaveIcon
} from '@mui/icons-material';
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
    if (device && open) {
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
      setError(null);
      api.get('/api/users/').then((res) => {
        setUsers(res.data?.results || res.data || []);
      }).catch(() => {});
    }
  }, [device, open]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.model?.trim()) {
      setError('Model name is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        model: formData.model.trim(),
        variant: formData.variant,
        capacity: formData.capacity.trim() || null,
        color: formData.color.trim() || null,
        battery_health: formData.battery_health !== '' && !isNaN(formData.battery_health) ? parseInt(formData.battery_health, 10) : null,
        battery_cycle: formData.battery_cycle !== '' && !isNaN(formData.battery_cycle) ? parseInt(formData.battery_cycle, 10) : null,
        buying_price: formData.buying_price !== '' && !isNaN(formData.buying_price) ? parseFloat(formData.buying_price) : 0,
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3.5,
          overflow: 'hidden',
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.18)'
        }
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          pt: 2.5,
          pb: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '12px',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <EditIcon sx={{ fontSize: 24 }} />
          </Box>
          <div>
            <Typography variant="h6" fontWeight={800} letterSpacing={-0.3} lineHeight={1.2}>
              Edit Device Specs
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              Update hardware specifications, battery stats, or ownership
            </Typography>
          </div>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'action.hover', color: 'text.primary' }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, py: 2.5, maxHeight: 'calc(80vh - 120px)', overflowY: 'auto' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Device Info */}
            <Grid item xs={12}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="primary.main"
                sx={{ letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 0.5 }}
              >
                Model & Specifications
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Model Name *"
                fullWidth
                size="small"
                value={formData.model}
                onChange={handleChange('model')}
                required
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
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
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              >
                {VARIANTS.map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
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
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
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
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            {/* Battery & Valuation */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="primary.main"
                sx={{ letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 0.5 }}
              >
                Battery & Ownership
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Battery Health"
                type="number"
                fullWidth
                size="small"
                value={formData.battery_health}
                onChange={handleChange('battery_health')}
                placeholder="98"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Cycle Count"
                type="number"
                fullWidth
                size="small"
                value={formData.battery_cycle}
                onChange={handleChange('battery_cycle')}
                placeholder="250"
                InputProps={{
                  endAdornment: <InputAdornment position="end">CC</InputAdornment>,
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Buying Price"
                type="number"
                fullWidth
                size="small"
                value={formData.buying_price}
                onChange={handleChange('buying_price')}
                placeholder="0.00"
                InputProps={{
                  endAdornment: <InputAdornment position="end">BDT</InputAdornment>,
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Assigned Owner"
                fullWidth
                size="small"
                value={formData.current_owner}
                onChange={handleChange('current_owner')}
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              >
                <MenuItem value="">
                  <em>None (Unassigned)</em>
                </MenuItem>
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

            {/* Notes */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="primary.main"
                sx={{ letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 0.5 }}
              >
                Notes
              </Typography>
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
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
            gap: 1
          }}
        >
          <Button
            onClick={onClose}
            color="inherit"
            disabled={loading}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              px: 2.5,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
