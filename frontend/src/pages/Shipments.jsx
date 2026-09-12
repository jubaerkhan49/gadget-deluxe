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
  LocalShipping as ShippingIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  CalendarToday as DateIcon,
  Business as SupplierIcon,
  Smartphone as PhoneIcon,
  ArrowForward as ArrowForwardIcon,
  Archive as ArchiveIcon,
  CheckCircleOutline as CheckCircleIcon,
  Inventory2 as ActiveIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { shipmentApi } from '../api/client';
import AddShipmentDialog from '../dialogs/AddShipmentDialog';
import EditShipmentDialog from '../dialogs/EditShipmentDialog';
import ShipmentDetailDialog from '../dialogs/ShipmentDetailDialog';

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
  const [selectedShipment, setSelectedShipment] = useState(null);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shipmentToDelete, setShipmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      const res = await shipmentApi.getAll();
      setShipments(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load shipments', { variant: 'error' });
    } finally {
      setLoading(false);
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

        <Stack direction="row" spacing={1.5}>
          {/* Archive Button placed beside New Shipment Batch */}
          <Button
            variant={viewTab === 'ARCHIVED' ? 'contained' : 'outlined'}
            startIcon={viewTab === 'ARCHIVED' ? <ActiveIcon /> : <ArchiveIcon />}
            onClick={() => setViewTab(viewTab === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED')}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              bgcolor: viewTab === 'ARCHIVED' ? 'grey.800' : undefined,
              color: viewTab === 'ARCHIVED' ? '#fff' : undefined,
              '&:hover': {
                bgcolor: viewTab === 'ARCHIVED' ? 'grey.900' : undefined
              }
            }}
          >
            {viewTab === 'ARCHIVED'
              ? 'Active Batches'
              : `Archived (${archivedShipments.length})`}
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
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
          placeholder={`Search ${viewTab === 'ACTIVE' ? 'Active' : 'Archived'} Shipments by Tracking Number, Supplier, or Agent...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            )
          }}
        />
      </Paper>

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
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          icon={<PhoneIcon sx={{ fontSize: '15px !important', color: isArchived ? 'success.main' : 'primary.main' }} />}
                          label={`${shipment.devices_count || 0} ${shipment.devices_count === 1 ? 'Device' : 'Devices'}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            borderRadius: '10px',
                            bgcolor: (theme) =>
                              isArchived
                                ? theme.palette.mode === 'dark'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : '#ECFDF5'
                                : theme.palette.mode === 'dark'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : '#EFF6FF',
                            color: isArchived ? 'success.main' : 'primary.main',
                            border: '1px solid',
                            borderColor: (theme) =>
                              isArchived
                                ? theme.palette.mode === 'dark'
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : '#A7F3D0'
                                : theme.palette.mode === 'dark'
                                ? 'rgba(59, 130, 246, 0.3)'
                                : '#BFDBFE',
                            px: 0.6,
                            py: 0.2
                          }}
                        />

                        {isArchived && (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: 'success.main' }} />}
                            label="In Stock"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              borderRadius: '8px',
                              height: 24
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
    </Box>
  );
}
