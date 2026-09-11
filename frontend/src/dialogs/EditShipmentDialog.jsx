import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress
} from '@mui/material';
import { Edit as EditIcon, CheckCircleOutline as CheckIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { shipmentApi } from '../api/client';

export default function EditShipmentDialog({ open, onClose, shipment, onShipmentUpdated }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    tracking_number: '',
    supplier_name: '',
    shipping_company: '',
    receive_date: '',
    shipping_cost: '',
    discount: '',
    notes: ''
  });

  useEffect(() => {
    if (open && shipment) {
      setFormData({
        tracking_number: shipment.tracking_number || '',
        supplier_name: shipment.supplier_name || '',
        shipping_company: shipment.shipping_company || '',
        receive_date: shipment.receive_date || '',
        shipping_cost: shipment.shipping_cost ? String(shipment.shipping_cost) : '',
        discount: shipment.discount ? String(shipment.discount) : '',
        notes: shipment.notes || ''
      });
    }
  }, [open, shipment]);

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tracking_number.trim()) {
      enqueueSnackbar('Tracking Number is required', { variant: 'error' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        tracking_number: formData.tracking_number.trim(),
        supplier_name: formData.supplier_name.trim(),
        shipping_company: formData.shipping_company.trim() || null,
        receive_date: formData.receive_date || null,
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : 0,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        notes: formData.notes.trim() || null
      };

      const res = await shipmentApi.update(shipment.id, payload);
      enqueueSnackbar('Shipment updated successfully', { variant: 'success' });
      if (onShipmentUpdated) onShipmentUpdated(res.data);
      onClose();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.detail || 'Failed to update shipment', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!shipment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <EditIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          Edit Shipment #{shipment.tracking_number}
        </Typography>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                size="small"
                label="Tracking Number"
                value={formData.tracking_number}
                onChange={handleChange('tracking_number')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Supplier Name"
                value={formData.supplier_name}
                onChange={handleChange('supplier_name')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Shipping Company / Agent"
                value={formData.shipping_company}
                onChange={handleChange('shipping_company')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Receive Date (CN)"
                value={formData.receive_date}
                onChange={handleChange('receive_date')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Shipping Cost (BDT)"
                value={formData.shipping_cost}
                onChange={handleChange('shipping_cost')}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Discount / Cashback (BDT)"
                value={formData.discount}
                onChange={handleChange('discount')}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Notes"
                value={formData.notes}
                onChange={handleChange('notes')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
