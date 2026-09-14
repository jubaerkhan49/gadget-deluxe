import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  LocalShipping as ShippingIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  CalendarToday as DateIcon,
  Business as SupplierIcon,
  Smartphone as PhoneIcon,
  ArrowForward as ArrowForwardIcon,
  Archive as ArchiveIcon,
  CheckCircleOutline as CheckCircleIcon,
  Inventory2 as ActiveIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { shipmentApi } from '../api/client';
import AddShipmentDialog from '../dialogs/AddShipmentDialog';
import EditShipmentDialog from '../dialogs/EditShipmentDialog';
import ShipmentDetailDialog from '../dialogs/ShipmentDetailDialog';
import DailyReceivedReportDialog from '../dialogs/DailyReceivedReportDialog';

export default function Shipments() {
  const { enqueueSnackbar } = useSnackbar();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState('ACTIVE'); // 'ACTIVE' | 'ARCHIVED'

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shipmentToDelete, setShipmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchShipments();

    // Auto-sync polling every 6 seconds
    const interval = setInterval(() => {
      fetchShipments(true);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const fetchShipments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await shipmentApi.getAll();
      setShipments(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      if (!silent) {
        enqueueSnackbar('Failed to load shipments', { variant: 'error' });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!shipmentToDelete) return;
    try {
      setDeleting(true);
      await shipmentApi.delete(shipmentToDelete.id);
      enqueueSnackbar('Shipment deleted successfully', { variant: 'success' });
      setDeleteConfirmOpen(false);
      setShipmentToDelete(null);
      fetchShipments();
    } catch (err) {
      enqueueSnackbar('Failed to delete shipment', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // Determine if a shipment is archived (all devices inside are In Stock / received)
  const isShipmentArchived = (s) => {
    if (!s.devices_count || s.devices_count === 0) return false;
    if (s.is_archived !== undefined) return s.is_archived;
    return (s.pending_devices_count || 0) === 0;
  };

  const activeShipments = shipments.filter((s) => !isShipmentArchived(s));
  const archivedShipments = shipments.filter((s) => isShipmentArchived(s));

  const currentList = viewTab === 'ACTIVE' ? activeShipments : archivedShipments;

  const filteredShipments = currentList.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.tracking_number?.toLowerCase().includes(q) ||
      s.supplier_name?.toLowerCase().includes(q) ||
      s.shipping_company?.toLowerCase().includes(q)
    );
  });

  const calculateSearchStats = () => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase().trim();
    // Search across ALL shipments (both active and archived) for complete agent/supplier overview
    const allMatching = shipments.filter(
      (s) =>
        s.tracking_number?.toLowerCase().includes(q) ||
        s.supplier_name?.toLowerCase().includes(q) ||
        s.shipping_company?.toLowerCase().includes(q)
    );

    const totalBatches = allMatching.length;
    const totalDevices = allMatching.reduce((acc, s) => acc + (s.devices_count || 0), 0);
    const deliveredDevices = allMatching.reduce((acc, s) => {
      const delivered = s.received_devices_count !== undefined
        ? s.received_devices_count
        : ((s.devices_count || 0) - (s.pending_devices_count || 0));
      return acc + (delivered || 0);
    }, 0);
    const pendingDevices = allMatching.reduce((acc, s) => acc + (s.pending_devices_count || 0), 0);
    const deliveryRate = totalDevices > 0 ? Math.round((deliveredDevices / totalDevices) * 100) : 0;

    return {
      totalBatches,
      totalDevices,
      deliveredDevices,
      pendingDevices,
      deliveryRate
    };
  };

  const searchStats = calculateSearchStats();

  return (
    <Box sx={{ pb: 4 }}>
      {/* Page Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3
        }}
      >
        <div>
          <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
            {viewTab === 'ACTIVE' ? 'Inbound Shipments' : 'Archived Shipments'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {viewTab === 'ACTIVE'
              ? `Track active batches from China / international suppliers (${activeShipments.length} active)`
              : `Historical archive of fully received and stocked batches (${archivedShipments.length} archived)`}
          </Typography>
        </div>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
          {/* 1. Archive Button (Left side) */}
          <Button
            variant={viewTab === 'ARCHIVED' ? 'contained' : 'outlined'}
            startIcon={viewTab === 'ARCHIVED' ? <ActiveIcon /> : <ArchiveIcon />}
            onClick={() => setViewTab(viewTab === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED')}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              px: 2,
              py: 0.85,
              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : '#CBD5E1',
              bgcolor: viewTab === 'ARCHIVED' ? 'primary.main' : undefined,
              color: viewTab === 'ARCHIVED' ? '#fff' : 'text.primary',
              '&:hover': {
                bgcolor: viewTab === 'ARCHIVED' ? 'primary.dark' : 'action.hover',
                borderColor: 'primary.main'
              }
            }}
          >
            {viewTab === 'ARCHIVED'
              ? 'Active Batches'
              : `Archived (${archivedShipments.length})`}
          </Button>

          {/* 2. Daily Reception Report Button */}
          <Button
            variant="outlined"
            startIcon={<ReportIcon sx={{ color: 'primary.main' }} />}
            onClick={() => setReportDialogOpen(true)}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              px: 2,
              py: 0.85,
              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.4)' : '#BFDBFE',
              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(239, 246, 255, 0.75)',
              color: 'primary.main',
              '&:hover': {
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.16)' : '#DBEAFE',
                borderColor: 'primary.main'
              }
            }}
          >
            Daily Received Report
          </Button>

          {/* 3. New Shipment Batch Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              px: 2.25,
              py: 0.85,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)'
            }}
          >
            New Shipment Batch
          </Button>
        </Stack>
      </Box>

      {/* Search Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={`Search ${viewTab === 'ACTIVE' ? 'Active' : 'Archived'} Shipments by Tracking Number, Supplier, or Agent (e.g. "AB Group")...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />
      </Paper>

      {/* Dynamic Agent / Supplier Analytics Summary Banner */}
      {searchStats && (
        <Paper
          variant="outlined"
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3,
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)'
                : 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.06)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2.5,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                }}
              >
                <ShippingIcon fontSize="small" />
              </Box>
              <div>
                <Typography variant="subtitle1" fontWeight={800} letterSpacing={-0.3}>
                  Summary for "{searchQuery}"
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Found across {searchStats.totalBatches} {searchStats.totalBatches === 1 ? 'batch' : 'batches'} (Active & Historical Archive)
                </Typography>
              </div>
            </Box>

            {/* Delivery Rate Badge */}
            <Chip
              label={`${searchStats.deliveryRate}% Delivered`}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '0.8rem',
                bgcolor: searchStats.deliveryRate === 100 ? '#DCFCE7' : '#DBEAFE',
                color: searchStats.deliveryRate === 100 ? '#16A34A' : '#2563EB',
                border: '1px solid',
                borderColor: searchStats.deliveryRate === 100 ? '#86EFAC' : '#93C5FD',
                borderRadius: '8px',
                px: 1,
                py: 0.5
              }}
            />
          </Box>

          {/* 3 Metric Stat Cards */}
          <Grid container spacing={2}>
            {/* Total Inbound Devices */}
            <Grid item xs={12} sm={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF',
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <PhoneIcon fontSize="medium" />
                </Box>
                <div>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Total Inbound Devices
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="text.primary">
                    {searchStats.totalDevices}
                  </Typography>
                </div>
              </Paper>
            </Grid>

            {/* Delivered / In Stock */}
            <Grid item xs={12} sm={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.12)' : '#F0FDF4',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.35)' : '#BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.25)' : '#DCFCE7',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CheckCircleIcon fontSize="medium" />
                </Box>
                <div>
                  <Typography variant="caption" color="#16A34A" fontWeight={700}>
                    Delivered to You (In Stock)
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="#16A34A">
                    {searchStats.deliveredDevices}{' '}
                    <Typography component="span" variant="body2" fontWeight={600} color="text.secondary">
                      ({searchStats.deliveryRate}%)
                    </Typography>
                  </Typography>
                </div>
              </Paper>
            </Grid>

            {/* Pending Delivery */}
            <Grid item xs={12} sm={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 88, 12, 0.12)' : '#FFF7ED',
                  border: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 88, 12, 0.35)' : '#FED7AA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 88, 12, 0.25)' : '#FFEDD5',
                    color: '#EA580C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ShippingIcon fontSize="medium" />
                </Box>
                <div>
                  <Typography variant="caption" color="#EA580C" fontWeight={700}>
                    Pending Delivery (In Transit)
                  </Typography>
                  <Typography variant="h5" fontWeight={800} color="#EA580C">
                    {searchStats.pendingDevices}{' '}
                    <Typography component="span" variant="body2" fontWeight={600} color="text.secondary">
                      ({100 - searchStats.deliveryRate}%)
                    </Typography>
                  </Typography>
                </div>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Shipments Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredShipments.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
          {viewTab === 'ACTIVE' ? (
            <>
              <ShippingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                No Active Shipments
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                All shipments have been received and moved to the archive, or no shipments match your search.
              </Typography>
              <Stack direction="row" spacing={1.5} justifyContent="center">
                {archivedShipments.length > 0 && (
                  <Button
                    variant="outlined"
                    startIcon={<ArchiveIcon />}
                    onClick={() => setViewTab('ARCHIVED')}
                  >
                    View Archived Shipments ({archivedShipments.length})
                  </Button>
                )}
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialogOpen(true)}
                >
                  Create New Shipment
                </Button>
              </Stack>
            </>
          ) : (
            <>
              <ArchiveIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                No Archived Shipments
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                When all devices in an active shipment are received into In Stock, the shipment batch will automatically move here.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ActiveIcon />}
                onClick={() => setViewTab('ACTIVE')}
              >
                Back to Active Shipments
              </Button>
            </>
          )}
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filteredShipments.map((shipment) => {
            const isArchived = isShipmentArchived(shipment);
            return (
              <Grid item xs={12} md={6} lg={4} key={shipment.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: (theme) =>
                        theme.palette.mode === 'dark'
                          ? '0 12px 28px rgba(0,0,0,0.45)'
                          : '0 12px 28px rgba(0,0,0,0.06)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 2.5, flex: 1 }}>
                    {/* Top Row: Tracking & Edit Action */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" fontWeight={800} noWrap>
                          #{shipment.tracking_number}
                        </Typography>
                      </Box>

                      {/* Edit Option */}
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShipment(shipment);
                          setEditDialogOpen(true);
                        }}
                        sx={{ borderRadius: 2, textTransform: 'none', px: 1.5 }}
                      >
                        Edit
                      </Button>
                    </Box>

                    {/* Supplier & Agent Info */}
                    <Stack spacing={1} sx={{ my: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SupplierIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">Supplier:</Typography>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {shipment.supplier_name || 'Unknown'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ShippingIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">Agent:</Typography>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {shipment.shipping_company || 'None'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DateIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">Received Date (CN):</Typography>
                        <Typography variant="body2" fontWeight={700} color="primary">
                          {shipment.receive_date || 'Pending'}
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Device Count Badge & Details Button */}
                    <Box
                      sx={{
                        pt: 1.5,
                        borderTop: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 1
                      }}
                    >
                      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ gap: 0.5 }}>
                        <Chip
                          icon={<PhoneIcon sx={{ fontSize: '14px !important' }} />}
                          label={`${shipment.devices_count || 0} Total`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            borderRadius: '8px',
                            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                            color: 'text.secondary'
                          }}
                        />

                        {/* Delivered Badge */}
                        {(shipment.received_devices_count > 0 || isArchived) && (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16A34A !important' }} />}
                            label={`${isArchived ? (shipment.devices_count || 0) : (shipment.received_devices_count || 0)} Delivered`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              borderRadius: '8px',
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.15)' : '#DCFCE7',
                              color: '#16A34A',
                              border: '1px solid',
                              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.3)' : '#BBF7D0'
                            }}
                          />
                        )}

                        {/* Pending Badge */}
                        {!isArchived && (shipment.pending_devices_count > 0) && (
                          <Chip
                            label={`${shipment.pending_devices_count} Pending`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              borderRadius: '8px',
                              bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 88, 12, 0.15)' : '#FFEDD5',
                              color: '#EA580C',
                              border: '1px solid',
                              borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 88, 12, 0.3)' : '#FED7AA'
                            }}
                          />
                        )}
                      </Stack>

                      <Button
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => {
                          setSelectedShipment(shipment);
                          setDetailDialogOpen(true);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                      >
                        View Batch
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add Shipment Dialog */}
      <AddShipmentDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onShipmentCreated={() => fetchShipments()}
      />

      {/* Edit Shipment Dialog */}
      <EditShipmentDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedShipment(null);
        }}
        shipment={selectedShipment}
        onShipmentUpdated={() => fetchShipments()}
      />

      {/* Shipment Detail Dialog */}
      <ShipmentDetailDialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedShipment(null);
        }}
        shipment={selectedShipment}
        onEditShipment={(s) => {
          setSelectedShipment(s);
          setEditDialogOpen(true);
        }}
        onShipmentDeleted={() => fetchShipments()}
        onShipmentUpdated={() => fetchShipments()}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Shipment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete shipment{' '}
            <strong>#{shipmentToDelete?.tracking_number}</strong>? Devices linked to this shipment will remain in inventory.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Daily Reception Report Modal */}
      <DailyReceivedReportDialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
      />
    </Box>
  );
}
