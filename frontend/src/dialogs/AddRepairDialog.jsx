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
  CircularProgress,
  Autocomplete,
  Paper,
  Box,
  Chip
} from '@mui/material';
import { Build as RepairIcon, CheckCircleOutline as CheckIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi, repairApi } from '../api/client';

export default function AddRepairDialog({ open, onClose, onRepairCreated, initialDevice = null }) {
  const { enqueueSnackbar } = useSnackbar();
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [formData, setFormData] = useState({
    issue_description: '',
    sent_date: new Date().toISOString().split('T')[0],
    repair_center: 'Shenzhen Master Lab',
    country: 'China',
    repair_cost: '0',
    status: 'IN_PROGRESS',
    repair_notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchDevices();
      if (initialDevice) {
        setSelectedDevice(initialDevice);
      }
    }
  }, [open, initialDevice]);

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const res = await deviceApi.getAll();
      setDevices(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDevice) {
      enqueueSnackbar('Please select a device to log for repair', { variant: 'error' });
      return;
    }
    if (!formData.issue_description.trim()) {
      enqueueSnackbar('Issue description is required', { variant: 'error' });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        device: selectedDevice.id,
        issue_description: formData.issue_description.trim(),
        sent_date: formData.sent_date,
        repair_center: formData.repair_center.trim(),
        country: formData.country.trim() || 'China',
        repair_cost: parseFloat(formData.repair_cost) || 0,
        status: formData.status,
        repair_notes: formData.repair_notes.trim() || null
      };

      const res = await repairApi.create(payload);

      // Automatically move device status to UNDER_REPAIR
      const deviceUpdate = {
        current_status: 'UNDER_REPAIR'
      };
      if (selectedDevice.is_b2b) {
        deviceUpdate.b2b_status = 'SENT_FOR_REPAIR';
      }
      await deviceApi.update(selectedDevice.id, deviceUpdate);

      enqueueSnackbar('Repair record created successfully!', { variant: 'success' });
      if (onRepairCreated) onRepairCreated(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.detail || 'Failed to create repair record', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <RepairIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Log Device For Repair
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {initialDevice ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                      {initialDevice.model} {initialDevice.capacity ? `• ${initialDevice.capacity}` : ''} {initialDevice.color ? `• ${initialDevice.color}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      IMEI: <strong>{initialDevice.imei}</strong> {initialDevice.variant ? `(${initialDevice.variant})` : ''}
                    </Typography>
                  </Box>
                  <Chip
                    icon={<RepairIcon sx={{ fontSize: '14px !important' }} />}
                    label="Moving to Under Repair"
                    size="small"
                    color="warning"
                    sx={{ fontWeight: 700, borderRadius: '8px' }}
                  />
                </Paper>
              ) : (
                <Autocomplete
                  options={devices}
                  getOptionLabel={(option) =>
                    `${option.model} (${option.variant || 'Standard'}) - IMEI: ${option.imei} [${option.status_display || option.current_status}]`
                  }
                  value={selectedDevice}
                  onChange={(event, newValue) => setSelectedDevice(newValue)}
                  loading={loadingDevices}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label="Select Device"
                      placeholder="Search by model or IMEI..."
                      size="small"
                    />
                  )}
                />
              )}
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={2.5}
                size="small"
                label="Hardware Issue / Fault Description"
                value={formData.issue_description}
                onChange={handleChange('issue_description')}
                placeholder="e.g. Display lines, Face ID not working, No power, Battery issue..."
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                size="small"
                label="Repair Center / Technician"
                value={formData.repair_center}
                onChange={handleChange('repair_center')}
                placeholder="e.g. Shenzhen Master Lab"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Country / Facility"
                value={formData.country}
                onChange={handleChange('country')}
                placeholder="China"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Sent Date"
                value={formData.sent_date}
                onChange={handleChange('sent_date')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Initial Repair Status"
                value={formData.status}
                onChange={handleChange('status')}
              >
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="SENT_TO_CHINA">Sent To China</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="UNREPAIRABLE">Unrepairable</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Estimated Repair Cost (BDT)"
                value={formData.repair_cost}
                onChange={handleChange('repair_cost')}
                placeholder="0"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Additional Notes"
                value={formData.repair_notes}
                onChange={handleChange('repair_notes')}
              />
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
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon sx={{ color: '#ffffff !important' }} />}
            sx={{
              color: '#ffffff !important',
              fontWeight: 600,
              '&.Mui-disabled': {
                color: 'rgba(255, 255, 255, 0.7) !important',
                bgcolor: 'primary.main',
                opacity: 0.65
              }
            }}
          >
            Submit Repair
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
