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
  ArrowForward as ArrowForwardIcon
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

  const filteredShipments = shipments.filter((s) => {
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
            Inbound Shipments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track batches from China / international suppliers to Bangladesh
          </Typography>
        </div>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
        >
          New Shipment Batch
        </Button>
      </Box>

      {/* Search Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by Tracking Number, Supplier, or Agent..."
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
          <ShippingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" fontWeight={700}>
            No Shipments Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
            Create a new inbound shipment batch to start tracking devices.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
            Create First Shipment
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filteredShipments.map((shipment) => (
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
                  {/* Top Row: Leftmost Delete Icon, Tracking & Edit Action */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {/* Leftmost Delete Icon */}
                      <Tooltip title="Delete Shipment">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShipmentToDelete(shipment);
                            setDeleteConfirmOpen(true);
                          }}
                          sx={{
                            backgroundColor: (theme) =>
                              theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                            '&:hover': {
                              backgroundColor: (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.15)'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Typography variant="h6" fontWeight={800} noWrap>
                        #{shipment.tracking_number}
                      </Typography>
                    </Stack>

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
                      justifyContent: 'space-between'
                    }}
                  >
                    <Chip
                      icon={<PhoneIcon fontSize="small" />}
                      label={`${shipment.devices_count || 0} Devices`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />

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
          ))}
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
