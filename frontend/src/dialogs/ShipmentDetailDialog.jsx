import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  DialogContentText,
  TextField,
  Tooltip
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Storefront as StockIcon,
  CalendarToday as DateIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi, shipmentApi } from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';

export default function ShipmentDetailDialog({
  open,
  onClose,
  shipment,
  onEditShipment,
  onShipmentDeleted,
  onShipmentUpdated
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [receivingAll, setReceivingAll] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open && shipment) {
      fetchDevices();
    }
  }, [open, shipment]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await deviceApi.getAll();
      const allDevices = res.data.results || res.data || [];
      const shipmentDevices = allDevices.filter((d) => d.current_shipment === shipment.id);
      setDevices(shipmentDevices);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load shipment devices', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceBdDateChange = async (deviceId, dateVal) => {
    try {
      await deviceApi.update(deviceId, { received_date_bd: dateVal || null });
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, received_date_bd: dateVal } : d))
      );
      enqueueSnackbar('BD Received Date updated', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to update BD date', { variant: 'error' });
    }
  };

  const handleMoveToInStock = async (deviceId) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await deviceApi.update(deviceId, {
        current_status: 'IN_STOCK',
        received_date_bd: today
      });
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? res.data : d))
      );
      enqueueSnackbar('Device moved to In Stock!', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to update status', { variant: 'error' });
    }
  };

  const handleReceiveAllToStock = async () => {
    try {
      setReceivingAll(true);
      const today = new Date().toISOString().split('T')[0];
      const waitingDevices = devices.filter((d) => d.current_status === 'WAITING_SHIPMENT');
      
      if (waitingDevices.length === 0) {
        enqueueSnackbar('All devices in this shipment are already received or in stock.', { variant: 'info' });
        return;
      }

      await Promise.all(
        waitingDevices.map((d) =>
          deviceApi.update(d.id, {
            current_status: 'IN_STOCK',
            received_date_bd: today
          })
        )
      );

      enqueueSnackbar(`Successfully moved ${waitingDevices.length} device(s) to In Stock!`, { variant: 'success' });
      fetchDevices();
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to receive all devices', { variant: 'error' });
    } finally {
      setReceivingAll(false);
    }
  };

  const handleDeleteShipment = async () => {
    try {
      setDeleting(true);
      await shipmentApi.delete(shipment.id);
      enqueueSnackbar('Shipment deleted successfully', { variant: 'success' });
      setDeleteConfirmOpen(false);
      onClose();
      if (onShipmentDeleted) onShipmentDeleted(shipment.id);
    } catch (err) {
      enqueueSnackbar('Failed to delete shipment', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  if (!shipment) return null;

  const inStockCount = devices.filter((d) => d.current_status === 'IN_STOCK').length;
  const waitingCount = devices.filter((d) => d.current_status === 'WAITING_SHIPMENT').length;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1.5,
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ShippingIcon color="primary" />
            <div>
              <Typography variant="h6" fontWeight={700}>
                Shipment #{shipment.tracking_number}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supplier: {shipment.supplier_name || 'Unknown'} • Agent: {shipment.shipping_company || 'None'}
              </Typography>
            </div>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => {
                if (onEditShipment) onEditShipment(shipment);
              }}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete
            </Button>
            <IconButton onClick={onClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* Top Metrics Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Total Devices</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {devices.length || shipment.devices_count || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Received Date (CN)</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {shipment.receive_date || '—'}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">In Stock in BD</Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {inStockCount}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">Waiting Shipment</Typography>
                <Typography variant="h6" fontWeight={700} color="warning.main">
                  {waitingCount}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Action Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Batch Devices ({devices.length})
            </Typography>
            {waitingCount > 0 && (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={receivingAll ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <StockIcon sx={{ color: '#ffffff !important' }} />}
                disabled={receivingAll}
                onClick={handleReceiveAllToStock}
                sx={{
                  color: '#ffffff !important',
                  fontWeight: 700,
                  '& .MuiSvgIcon-root': { color: '#ffffff !important' }
                }}
              >
                Receive All to BD Stock ({waitingCount})
              </Button>
            )}
          </Box>

          {/* Devices Table */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : devices.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <Typography color="text.secondary">
                No devices currently assigned to this shipment batch.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Device Model</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Variant</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>IMEI / Serial</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Buying Cost</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Receive Date (BD)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {devices.map((dev) => (
                    <TableRow key={dev.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {dev.model}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dev.capacity || ''} {dev.color ? `• ${dev.color}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <VariantBadge variant={dev.variant} />
                      </TableCell>
                      <TableCell>
                        <CopyableText text={dev.imei} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {dev.buying_price !== null && dev.buying_price !== undefined
                            ? Math.round(Number(dev.buying_price)).toLocaleString()
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={dev.current_status} />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="date"
                          value={dev.received_date_bd || ''}
                          onChange={(e) => handleDeviceBdDateChange(dev.id, e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 140 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {dev.current_status === 'WAITING_SHIPMENT' ? (
                          <Tooltip title="Mark Received in BD (In Stock)">
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => handleMoveToInStock(dev.id)}
                            >
                              Receive BD
                            </Button>
                          </Tooltip>
                        ) : (
                          <Chip size="small" label="In BD" color="success" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Shipment Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Shipment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete shipment <strong>#{shipment.tracking_number}</strong>? Devices linked to this shipment will have their shipment unlinked but will remain in your inventory.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteShipment}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
