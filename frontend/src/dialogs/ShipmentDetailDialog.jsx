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
  Tooltip,
  FormControlLabel,
  Switch,
  InputAdornment
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Storefront as StockIcon,
  Store as SupplierIcon,
  FlightTakeoff as AgentIcon,
  CalendarToday as DateIcon,
  Storefront as B2bIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { deviceApi, shipmentApi } from '../api/client';
import { apiCache } from '../utils/apiCache';
import StatusBadge from '../components/common/StatusBadge';
import { formatNumber } from '../utils/formatters';
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

  const getCachedDevices = () => {
    if (!shipment) return [];
    const cached = apiCache.get('/api/devices/');
    const all = cached?.results || cached || [];
    return all.filter((d) => d.current_shipment === shipment.id);
  };

  const [devices, setDevices] = useState(getCachedDevices);
  const [loading, setLoading] = useState(false);
  const [receivingAll, setReceivingAll] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // B2B Move Modal state
  const [b2bDialogOpen, setB2bDialogOpen] = useState(false);
  const [selectedB2bDevice, setSelectedB2bDevice] = useState(null);
  const [movingToB2b, setMovingToB2b] = useState(false);
  const [b2bForm, setB2bForm] = useState({
    b2b_shop_name: '',
    b2b_delivery_date: '',
    b2b_selling_price: '',
    b2b_has_issues: false,
    b2b_issue_notes: ''
  });

  useEffect(() => {
    if (open && shipment) {
      const initial = getCachedDevices();
      if (initial.length > 0) {
        setDevices(initial);
        fetchDevices(true);
      } else {
        fetchDevices(false);
      }
    }
  }, [open, shipment?.id]);

  const fetchDevices = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await deviceApi.getAll();
      const allDevices = res.data.results || res.data || [];
      apiCache.set('/api/devices/', allDevices);
      const shipmentDevices = allDevices.filter((d) => d.current_shipment === shipment.id);
      setDevices(shipmentDevices);
    } catch (err) {
      console.error(err);
      if (!silent) {
        enqueueSnackbar('Failed to load shipment devices', { variant: 'error' });
      }
    } finally {
      if (!silent) setLoading(false);
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
      if (onShipmentUpdated) onShipmentUpdated();
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
      if (onShipmentUpdated) onShipmentUpdated();
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to receive all devices', { variant: 'error' });
    } finally {
      setReceivingAll(false);
    }
  };

  const handleOpenMoveToB2b = (device) => {
    setSelectedB2bDevice(device);
    setB2bForm({
      b2b_shop_name: device.b2b_shop_name || '',
      b2b_delivery_date: device.b2b_delivery_date || new Date().toISOString().split('T')[0],
      b2b_selling_price: device.b2b_selling_price !== null && device.b2b_selling_price !== undefined ? device.b2b_selling_price : '',
      b2b_has_issues: Boolean(device.b2b_has_issues),
      b2b_issue_notes: device.b2b_issue_notes || ''
    });
    setB2bDialogOpen(true);
  };

  const handleSubmitMoveToB2b = async (e) => {
    e.preventDefault();
    if (!selectedB2bDevice) return;

    if (!b2bForm.b2b_shop_name.trim()) {
      enqueueSnackbar('Please enter the Shop / Business Name', { variant: 'warning' });
      return;
    }

    try {
      setMovingToB2b(true);
      const payload = {
        is_b2b: true,
        b2b_shop_name: b2bForm.b2b_shop_name.trim(),
        b2b_delivery_date: b2bForm.b2b_delivery_date || null,
        b2b_selling_price: b2bForm.b2b_selling_price !== '' ? Number(b2bForm.b2b_selling_price) : null,
        b2b_has_issues: b2bForm.b2b_has_issues,
        b2b_issue_notes: b2bForm.b2b_has_issues ? b2bForm.b2b_issue_notes.trim() : '',
        b2b_status: 'IN_INVENTORY',
        current_status: 'IN_STOCK',
        received_date_bd: selectedB2bDevice.received_date_bd || new Date().toISOString().split('T')[0]
      };

      await deviceApi.update(selectedB2bDevice.id, payload);
      enqueueSnackbar(`Device assigned to ${b2bForm.b2b_shop_name} and moved to B2B!`, { variant: 'success' });
      setB2bDialogOpen(false);
      fetchDevices();
      if (onShipmentUpdated) onShipmentUpdated();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.response?.data?.detail || 'Failed to move device to B2B', { variant: 'error' });
    } finally {
      setMovingToB2b(false);
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

  const totalDeviceCount = devices.length || shipment.devices_count || 0;
  const inBdCount = devices.filter((d) => d.current_status !== 'WAITING_SHIPMENT' || Boolean(d.received_date_bd)).length;
  const waitingCount = devices.filter((d) => d.current_status === 'WAITING_SHIPMENT' && !d.received_date_bd).length;

  const totalBuyingValue = devices.reduce((sum, d) => sum + (Number(d.buying_price) || 0), 0);
  const avgUnitCost = totalDeviceCount > 0 ? (totalBuyingValue / totalDeviceCount) : 0;
  const shippingCost = Number(shipment.net_shipping_cost ?? shipment.shipping_cost) || 0;
  const unitShippingCost = Number(shipment.unit_shipping_cost) || (totalDeviceCount > 0 ? (shippingCost / totalDeviceCount) : 0);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            p: { xs: 2, sm: 2.5 },
            pb: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            gap: 2
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1.75,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                  color: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE'
                }}
              >
                <ShippingIcon fontSize="small" />
              </Box>
              <Typography variant="h6" fontWeight={800} noWrap>
                Shipment #{shipment.tracking_number}
              </Typography>
            </Box>

            {/* Focused Supplier & Agent Tags */}
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.7,
                  px: 1.1,
                  py: 0.35,
                  borderRadius: 1.5,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.3)' : '#C7D2FE'
                }}
              >
                <SupplierIcon sx={{ fontSize: 15, color: '#6366F1' }} />
                <Typography component="span" variant="caption" color="text.secondary" fontWeight={600}>
                  Supplier:
                </Typography>
                <Typography component="span" variant="caption" fontWeight={800} sx={{ color: '#4F46E5', fontSize: '0.8rem' }}>
                  {shipment.supplier_name || 'Unknown'}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.7,
                  px: 1.1,
                  py: 0.35,
                  borderRadius: 1.5,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0'
                }}
              >
                <AgentIcon sx={{ fontSize: 15, color: '#10B981' }} />
                <Typography component="span" variant="caption" color="text.secondary" fontWeight={600}>
                  Agent:
                </Typography>
                <Typography component="span" variant="caption" fontWeight={800} sx={{ color: '#059669', fontSize: '0.8rem' }}>
                  {shipment.shipping_company || 'None'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.25 }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => {
                onClose();
                onEditShipment(shipment);
              }}
              sx={{ textTransform: 'none', fontWeight: 600, height: 32, fontSize: '0.8rem' }}
            >
              Edit Shipment
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteConfirmOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 600, height: 32, fontSize: '0.8rem' }}
            >
              Delete
            </Button>
            <IconButton onClick={onClose} size="small" sx={{ ml: 0.5 }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          {/* Shipment Key Metrics */}
          <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
            <Grid item xs={12} sm={3}>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, height: '100%' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                  TOTAL DEVICES
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ my: 0.25 }}>
                  {totalDeviceCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {inBdCount} in BD • {waitingCount} Waiting
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, height: '100%' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                  TOTAL VALUE (BDT)
                </Typography>
                <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ my: 0.25 }}>
                  {formatNumber(totalBuyingValue)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Avg: {formatNumber(avgUnitCost)} / unit
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, height: '100%' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                  SHIPPING COST (BDT)
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ my: 0.25 }}>
                  {formatNumber(shippingCost)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Unit Shipping: {formatNumber(unitShippingCost)}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                    STATUS
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {waitingCount === 0 && totalDeviceCount > 0 ? (
                      <Chip size="small" label="All Received in BD" color="success" sx={{ fontWeight: 700, height: 24, fontSize: '0.75rem' }} />
                    ) : inBdCount === 0 && totalDeviceCount > 0 ? (
                      <Chip size="small" label="Waiting Shipment" color="warning" sx={{ fontWeight: 700, height: 24, fontSize: '0.75rem' }} />
                    ) : inBdCount > 0 ? (
                      <Chip size="small" label={`Partial (${inBdCount}/${totalDeviceCount} in BD)`} color="info" sx={{ fontWeight: 700, height: 24, fontSize: '0.75rem' }} />
                    ) : (
                      <StatusBadge status={shipment.status || 'WAITING_SHIPMENT'} />
                    )}
                  </Box>
                </div>
                {shipment.receive_date && (
                  <Chip
                    size="small"
                    icon={<DateIcon sx={{ fontSize: '13px !important' }} />}
                    label={`Receive (CN): ${shipment.receive_date}`}
                    sx={{
                      mt: 1,
                      height: 22,
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      alignSelf: 'flex-start',
                      bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.1)',
                      color: 'primary.main',
                      border: '1px solid',
                      borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(99, 102, 241, 0.35)' : 'rgba(99, 102, 241, 0.25)',
                      '& .MuiChip-label': { px: 0.7 }
                    }}
                  />
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Batch Devices Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Batch Devices ({devices.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Track status and assign incoming devices directly to regular stock or client B2B orders.
              </Typography>
            </Box>

            {waitingCount > 0 && (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={receivingAll ? <CircularProgress size={15} color="inherit" /> : <StockIcon sx={{ fontSize: 16 }} />}
                onClick={handleReceiveAllToStock}
                disabled={receivingAll}
                sx={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  height: 32,
                  px: 1.5,
                  boxShadow: 'none'
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
                    <TableCell sx={{ fontWeight: 700 }}>IMEI Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Buying Cost</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Receive Date (BD)</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, minWidth: 180 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {devices.map((dev) => {
                    const cleanCap = dev.capacity ? String(dev.capacity).replace(/gb/gi, '').trim() : '';
                    const cleanCol = dev.color ? String(dev.color).trim().split(/\s+/)[0] : '';
                    const specs = [cleanCap, cleanCol].filter(Boolean).join(' • ');

                    return (
                      <TableRow key={dev.id} hover>
                        {/* Device Model & Specs with Inline Variant Chip */}
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {dev.model}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.25 }}>
                            {specs && (
                              <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                {specs}
                              </Typography>
                            )}
                            {specs && dev.variant && (
                              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>
                                •
                              </Typography>
                            )}
                            {dev.variant && <VariantBadge variant={dev.variant} size="small" />}
                          </Box>
                        </TableCell>

                        <TableCell>
                          <CopyableText text={dev.imei} />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {dev.buying_price !== null && dev.buying_price !== undefined
                              ? formatNumber(dev.buying_price)
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
                            sx={{
                              width: 135,
                              '& .MuiOutlinedInput-root': {
                                height: 30,
                                fontSize: '0.78rem',
                                borderRadius: 1.5
                              },
                              '& .MuiInputBase-input': {
                                py: 0.25,
                                px: 0.75
                              }
                            }}
                          />
                        </TableCell>

                        <TableCell align="right">
                          {dev.is_b2b ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                              <Chip
                                size="small"
                                label={`B2B: ${dev.b2b_shop_name || 'Client'}`}
                                sx={{
                                  height: 24,
                                  bgcolor: 'rgba(147, 51, 234, 0.12)',
                                  color: '#9333EA',
                                  fontWeight: 700,
                                  fontSize: '0.72rem'
                                }}
                              />
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => handleOpenMoveToB2b(dev)}
                                sx={{ color: '#9333EA', fontWeight: 600, fontSize: '0.75rem', textTransform: 'none', px: 0.8, minWidth: 0 }}
                              >
                                Edit
                              </Button>
                            </Box>
                          ) : (
                            <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
                              {dev.current_status === 'WAITING_SHIPMENT' && !dev.received_date_bd ? (
                                <Tooltip title="Mark Received in BD (Regular Stock)">
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    onClick={() => handleMoveToInStock(dev.id)}
                                    sx={{ height: 28, fontSize: '0.75rem', textTransform: 'none', fontWeight: 700, px: 1.2, boxShadow: 'none' }}
                                  >
                                    Receive BD
                                  </Button>
                                </Tooltip>
                              ) : (
                                <Chip size="small" label="In BD" color="success" variant="outlined" sx={{ height: 24, fontWeight: 700, fontSize: '0.72rem' }} />
                              )}
                              <Tooltip title="Assign to B2B Client Order">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<B2bIcon sx={{ fontSize: '0.9rem !important' }} />}
                                  onClick={() => handleOpenMoveToB2b(dev)}
                                  sx={{
                                    height: 28,
                                    color: '#9333EA',
                                    borderColor: 'rgba(147, 51, 234, 0.4)',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    textTransform: 'none',
                                    px: 1,
                                    '&:hover': {
                                      borderColor: '#9333EA',
                                      backgroundColor: 'rgba(147, 51, 234, 0.06)'
                                    }
                                  }}
                                >
                                  Move to B2B
                                </Button>
                              </Tooltip>
                            </Stack>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Move to B2B Confirmation / Setup Dialog */}
      <Dialog
        open={b2bDialogOpen}
        onClose={() => setB2bDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmitMoveToB2b}>
          <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  bgcolor: 'rgba(147, 51, 234, 0.12)',
                  color: '#9333EA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <B2bIcon />
              </Box>
              <div>
                <Typography variant="h6" fontWeight={800}>
                  Move Device to B2B
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedB2bDevice?.model} • IMEI: {selectedB2bDevice?.imei}
                </Typography>
              </div>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ pt: 2.5 }}>
            <DialogContentText sx={{ mb: 2.5, fontSize: '0.85rem' }}>
              Assigning this device to B2B ensures its cost is isolated from your personal capital investment while profits are tracked specifically for this client order.
            </DialogContentText>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Shop / Business Name"
                  placeholder="e.g. Gadget Galaxy, Apple Arena"
                  value={b2bForm.b2b_shop_name}
                  onChange={(e) => setB2bForm((p) => ({ ...p, b2b_shop_name: e.target.value }))}
                  required
                  autoFocus
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Target Delivery Date"
                  value={b2bForm.b2b_delivery_date}
                  onChange={(e) => setB2bForm((p) => ({ ...p, b2b_delivery_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Selling Price (to Shop)"
                  placeholder="0.00"
                  value={b2bForm.b2b_selling_price}
                  onChange={(e) => setB2bForm((p) => ({ ...p, b2b_selling_price: e.target.value }))}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">৳</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: b2bForm.b2b_has_issues ? 'error.main' : 'divider',
                    bgcolor: (theme) => b2bForm.b2b_has_issues
                      ? (theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2')
                      : 'transparent'
                  }}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={b2bForm.b2b_has_issues}
                        onChange={(e) => setB2bForm((p) => ({ ...p, b2b_has_issues: e.target.checked }))}
                        color="error"
                      />
                    }
                    label={
                      <Typography variant="body2" fontWeight={600}>
                        {b2bForm.b2b_has_issues ? 'Device has Hardware Issues / Defects' : 'No Issues Reported'}
                      </Typography>
                    }
                  />

                  {b2bForm.b2b_has_issues && (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Issue Details / Defect Note"
                      placeholder="e.g. Battery service required, broken glass..."
                      value={b2bForm.b2b_issue_notes}
                      onChange={(e) => setB2bForm((p) => ({ ...p, b2b_issue_notes: e.target.value }))}
                      sx={{ mt: 1.5 }}
                      required={b2bForm.b2b_has_issues}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, borderTop: 1, borderColor: 'divider' }}>
            <Button onClick={() => setB2bDialogOpen(false)} disabled={movingToB2b}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={movingToB2b}
              startIcon={movingToB2b && <CircularProgress size={16} color="inherit" />}
              sx={{
                background: 'linear-gradient(135deg, #9333EA 0%, #7928CA 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #7E22CE 0%, #6B21A8 100%)'
                }
              }}
            >
              Move to B2B
            </Button>
          </DialogActions>
        </form>
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
