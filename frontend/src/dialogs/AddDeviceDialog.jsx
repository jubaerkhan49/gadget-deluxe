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
  Divider,
  CircularProgress
} from '@mui/material';
import {
  PhoneIphone as PhoneIphoneIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Numbers as NumbersIcon,
  Devices as DevicesIcon,
  BatteryChargingFull as BatteryIcon,
  PersonOutline as PersonIcon,
  AttachMoney as MoneyIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import api from '../api/client';

const VARIANTS = ['Modified', 'USA eSim', 'Canada', 'Mexican', 'Korea', 'Singapore', 'Bypass'];

const STATUS_CHOICES = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'WAITING_SHIPMENT', label: 'Waiting Shipment' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RETURNED', label: 'Returned' },
];

const DEFAULT_FORM_DATA = {
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
  battery_cycle: '',
  buying_price: '',
  notes: '',
};

export default function AddDeviceDialog({ open, onClose, onSuccess, onDeviceCreated, initialData }) {
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          ...DEFAULT_FORM_DATA,
          ...initialData,
          battery_health: initialData.battery_health !== undefined ? String(initialData.battery_health) : '100',
          battery_cycle: initialData.battery_cycle !== undefined ? String(initialData.battery_cycle) : '',
          buying_price: initialData.buying_price !== undefined ? String(initialData.buying_price) : '',
        });
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
      setError(null);

      api.get('/api/users/').then((res) => {
        setUsers(res.data?.results || res.data || []);
      }).catch(() => {});
    }
  }, [open, initialData]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imei?.trim()) {
      setError('Primary IMEI is required.');
      return;
    }
    if (!formData.model?.trim()) {
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
        capacity: formData.capacity.trim() || null,
        color: formData.color.trim() || null,
        battery_health: formData.battery_health !== '' && !isNaN(formData.battery_health) ? parseInt(formData.battery_health, 10) : null,
        battery_cycle: formData.battery_cycle !== '' && !isNaN(formData.battery_cycle) ? parseInt(formData.battery_cycle, 10) : null,
        buying_price: formData.buying_price !== '' && !isNaN(formData.buying_price) ? parseFloat(formData.buying_price) : 0,
        current_owner: formData.current_owner ? parseInt(formData.current_owner, 10) : null,
        notes: formData.notes.trim() || null,
      };

      const res = await api.post('/api/devices/', payload);
      if (onDeviceCreated) onDeviceCreated(res.data);
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.imei?.[0] || err.response?.data?.error || err.response?.data?.detail || 'Failed to register device.';
      setError(msg);
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
            <PhoneIphoneIcon sx={{ fontSize: 24 }} />
          </Box>
          <div>
            <Typography variant="h6" fontWeight={800} letterSpacing={-0.3} lineHeight={1.2}>
              Register Single Device
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              Add a new phone to inventory with IMEI and hardware specs
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
            {/* --- Section 1: Device Identifiers --- */}
            <Grid item xs={12}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="primary.main"
                sx={{ letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 0.5 }}
              >
                Hardware Identifiers
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Primary IMEI *"
                fullWidth
                size="small"
                value={formData.imei}
                onChange={handleChange('imei')}
                placeholder="15-digit Primary IMEI"
                required
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Secondary IMEI2"
                fullWidth
                size="small"
                value={formData.imei2}
                onChange={handleChange('imei2')}
                placeholder="eSIM / Secondary IMEI"
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
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
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
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
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            {/* --- Section 2: Specifications & Status --- */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="primary.main"
                sx={{ letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 0.5 }}
              >
                Specifications & Status
              </Typography>
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
                select
                label="Status"
                fullWidth
                size="small"
                value={formData.current_status}
                onChange={handleChange('current_status')}
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              >
                {STATUS_CHOICES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
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
                placeholder="e.g. 256GB"
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
                placeholder="e.g. Natural Titanium"
                InputProps={{
                  sx: { borderRadius: 2 }
                }}
              />
            </Grid>

            {/* --- Section 3: Battery & Assignment --- */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="primary.main"
                sx={{ letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 0.5 }}
              >
                Battery & Assignment
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
                placeholder="100"
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
                label="Total Buying Cost"
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

            {/* --- Section 4: Notes --- */}
            <Grid item xs={12} sx={{ mt: 1 }}>
              <Typography
                variant="caption"
                fontWeight={700}
                color="primary.main"
                sx={{ letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', mb: 0.5 }}
              >
                Notes / Remarks
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Optional Remarks"
                multiline
                rows={2}
                fullWidth
                size="small"
                value={formData.notes}
                onChange={handleChange('notes')}
                placeholder="Physical condition, supplier note, accessories, etc."
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
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              px: 2.5,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            {loading ? 'Registering...' : 'Register Device'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
