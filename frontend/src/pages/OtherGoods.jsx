import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Grid,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  ShoppingBag as OtherGoodsIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  DeleteOutline as DeleteIcon,
  ContentCopy as CopyIcon,
  OpenInNew as OpenIcon,
  LocalShipping as ShippingIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as DeliveredIcon,
  FlightLand as ArrivedIcon,
  PendingActions as PendingIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { otherGoodsApi } from '../api/client';
import CreateOtherGoodsDialog from '../dialogs/CreateOtherGoodsDialog';
import UpdateOrderTrackingDialog, { TRACKING_STAGES } from '../dialogs/UpdateOrderTrackingDialog';

const STAGE_CONFIG = {
  ORDER_CONFIRMED: { label: '1. Order Confirmed', color: '#64748B', step: 1 },
  PAYMENT_RECEIVED: { label: '2. Payment Made', color: '#3B82F6', step: 2 },
  PRODUCT_PURCHASED: { label: '3. Product Purchased', color: '#8B5CF6', step: 3 },
  SHIPPED_TO_CN_WAREHOUSE: { label: '4. Shipped (CN Wh)', color: '#EC4899', step: 4 },
  SHIPPED_TO_BD: { label: '5. In Transit to BD', color: '#F59E0B', step: 5 },
  ARRIVED_AT_BD: { label: '6. Arrived at BD', color: '#10B981', step: 6 },
  RECEIVED_IN_BD: { label: '7. Received in BD', color: '#06B6D4', step: 7 },
  DELIVERED: { label: '8. Delivered', color: '#22C55E', step: 8 }
};

const CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'AIRPODS', label: 'AirPods & Audio' },
  { value: 'GADGETS', label: 'Gadgets' },
  { value: 'LAPTOP_PARTS', label: 'Laptop Parts' },
  { value: 'COSMETICS', label: 'Cosmetics' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'OTHER', label: 'Other' }
];

export default function OtherGoods() {
  const { enqueueSnackbar } = useSnackbar();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOrders = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      else setRefreshing(true);

      const res = await otherGoodsApi.getAll();
      const data = res.data?.results || res.data || [];
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch other goods orders:', err);
      enqueueSnackbar('Failed to load orders dataset.', { variant: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);
  }, []);

  const handleCopyLink = (orderId, e) => {
    e?.stopPropagation();
    const trackingUrl = `${window.location.origin}/track?order=${encodeURIComponent(orderId)}`;
    navigator.clipboard.writeText(trackingUrl);
    enqueueSnackbar(`Tracking Link copied: ${trackingUrl}`, { variant: 'success' });
  };

  const handleOpenCustomerPortal = (orderId, e) => {
    e?.stopPropagation();
    const trackingUrl = `${window.location.origin}/track?order=${encodeURIComponent(orderId)}`;
    window.open(trackingUrl, '_blank');
  };

  const handleDeleteClick = (order, e) => {
    e?.stopPropagation();
    setOrderToDelete(order);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      setDeleting(true);
      await otherGoodsApi.delete(orderToDelete.id);
      enqueueSnackbar(`Order ${orderToDelete.order_id} removed successfully.`, { variant: 'success' });
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
      fetchOrders(false);
    } catch (err) {
      console.error('Failed to delete order:', err);
      enqueueSnackbar('Failed to delete order.', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const inTransit = orders.filter((o) =>
      ['ORDER_CONFIRMED', 'PAYMENT_RECEIVED', 'PRODUCT_PURCHASED', 'SHIPPED_TO_CN_WAREHOUSE', 'SHIPPED_TO_BD'].includes(o.stage)
    ).length;
    const arrivedBD = orders.filter((o) => ['ARRIVED_AT_BD', 'RECEIVED_IN_BD'].includes(o.stage)).length;
    const delivered = orders.filter((o) => o.stage === 'DELIVERED').length;
    const totalDue = orders.reduce((sum, o) => sum + (parseFloat(o.due_amount) || 0), 0);
    const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const totalCollected = orders.reduce((sum, o) => sum + (parseFloat(o.payment_amount) || 0), 0);

    return { totalOrders, inTransit, arrivedBD, delivered, totalDue, totalRevenue, totalCollected };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = order.order_id?.toLowerCase().includes(q);
        const matchesCust = order.customer_name?.toLowerCase().includes(q);
        const matchesPhone = order.customer_phone?.toLowerCase().includes(q);
        const matchesProduct = order.product_name?.toLowerCase().includes(q);
        const matchesNotes = order.tracking_notes?.toLowerCase().includes(q);

        if (!matchesId && !matchesCust && !matchesPhone && !matchesProduct && !matchesNotes) {
          return false;
        }
      }

      // Stage Filter
      if (selectedStage !== 'ALL' && order.stage !== selectedStage) {
        return false;
      }

      // Category Filter
      if (selectedCategory !== 'ALL' && order.category !== selectedCategory) {
        return false;
      }

      // Payment Status Filter
      if (paymentFilter !== 'ALL') {
        const due = parseFloat(order.due_amount) || 0;
        const paid = parseFloat(order.payment_amount) || 0;
        if (paymentFilter === 'PAID' && due > 0) return false;
        if (paymentFilter === 'DUE' && due <= 0) return false;
        if (paymentFilter === 'UNPAID' && paid > 0) return false;
      }

      return true;
    });
  }, [orders, searchQuery, selectedStage, selectedCategory, paymentFilter]);

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredOrders, page, rowsPerPage]);

  return (
    <Box sx={{ pb: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.35)'
            }}
          >
            <OtherGoodsIcon />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} letterSpacing="-0.5px">
              Other Goods & Custom Orders
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Manage individual retail orders (Laptops, AirPods, Gadgets, Cosmetics) with 8-Stage Live Tracking
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => fetchOrders(false)}
            disabled={loading || refreshing}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #DB2777 0%, #9D174D 100%)'
              }
            }}
          >
            New Custom Order
          </Button>
        </Stack>
      </Box>

      {/* KPI Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (t) => (t.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.6)' : '#fff')
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              TOTAL CUSTOM ORDERS
            </Typography>
            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
              {metrics.totalOrders}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ৳ {metrics.totalRevenue.toLocaleString()} Total Value
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (t) => (t.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.6)' : '#fff')
            }}
          >
            <Typography variant="caption" color="warning.main" fontWeight={700}>
              IN TRANSIT / PIPELINE
            </Typography>
            <Typography variant="h4" fontWeight={800} color="warning.main" sx={{ mt: 0.5 }}>
              {metrics.inTransit}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Stages 1 to 5 (Purchased/Shipped)
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (t) => (t.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.6)' : '#fff')
            }}
          >
            <Typography variant="caption" color="info.main" fontWeight={700}>
              ARRIVED / RECEIVED BD
            </Typography>
            <Typography variant="h4" fontWeight={800} color="info.main" sx={{ mt: 0.5 }}>
              {metrics.arrivedBD}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Stages 6 & 7 (Ready for Customer)
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (t) => (t.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.6)' : '#fff')
            }}
          >
            <Typography variant="caption" color="success.main" fontWeight={700}>
              DELIVERED ORDERS
            </Typography>
            <Typography variant="h4" fontWeight={800} color="success.main" sx={{ mt: 0.5 }}>
              {metrics.delivered}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Stage 8 (Completed)
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: 1,
              borderColor: 'divider',
              background: (t) => (t.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.6)' : '#fff')
            }}
          >
            <Typography variant="caption" color="error.main" fontWeight={700}>
              OUTSTANDING DUE
            </Typography>
            <Typography variant="h4" fontWeight={800} color="error.main" sx={{ mt: 0.5 }}>
              ৳ {metrics.totalDue.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ৳ {metrics.totalCollected.toLocaleString()} Collected
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center'
        }}
      >
        <TextField
          size="small"
          placeholder="Search by Order ID, Customer, Phone, Product..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 280, flexGrow: 1 }}
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

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Pipeline Stage</InputLabel>
          <Select
            value={selectedStage}
            label="Pipeline Stage"
            onChange={(e) => {
              setSelectedStage(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All Stages (1-8)</MenuItem>
            {TRACKING_STAGES.map((st) => (
              <MenuItem key={st.id} value={st.id}>
                {st.step + 1}. {st.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(0);
            }}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Payment Status</InputLabel>
          <Select
            value={paymentFilter}
            label="Payment Status"
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="ALL">All Payments</MenuItem>
            <MenuItem value="DUE">Has Remaining Due</MenuItem>
            <MenuItem value="PAID">Fully Paid</MenuItem>
            <MenuItem value="UNPAID">Unpaid</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      {/* Orders Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          overflow: 'hidden'
        }}
      >
        <TableContainer sx={{ maxHeight: 'calc(100vh - 350px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Order ID</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Customer Details</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Product & Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Order Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tracking Stage</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Total / Shipping</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Paid / Due</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={36} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                      Loading other goods orders...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <OtherGoodsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="subtitle1" fontWeight={700}>
                      No custom orders found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchQuery || selectedStage !== 'ALL' || selectedCategory !== 'ALL'
                        ? 'Try adjusting your filters or search query.'
                        : 'Click "New Custom Order" above to register your first single item order.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => {
                  const stageInfo = STAGE_CONFIG[order.stage] || {
                    label: order.stage_display || order.stage,
                    color: '#64748B',
                    step: 1
                  };
                  const price = parseFloat(order.product_price) || 0;
                  const shipping = parseFloat(order.shipping_cost) || 0;
                  const total = parseFloat(order.total_amount) || price + shipping;
                  const paid = parseFloat(order.payment_amount) || 0;
                  const due = parseFloat(order.due_amount) || Math.max(0, total - paid);

                  return (
                    <TableRow
                      key={order.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: (t) =>
                            t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                        }
                      }}
                      onClick={() => {
                        setSelectedOrder(order);
                        setUpdateDialogOpen(true);
                      }}
                    >
                      {/* Order ID */}
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Typography variant="body2" fontWeight={800} color="primary.main">
                            {order.order_id}
                          </Typography>
                          <Tooltip title="Copy Tracking Link">
                            <IconButton
                              size="small"
                              onClick={(e) => handleCopyLink(order.order_id, e)}
                              sx={{ p: 0.3 }}
                            >
                              <CopyIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Open Public Tracking Portal">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={(e) => handleOpenCustomerPortal(order.order_id, e)}
                              sx={{ p: 0.3 }}
                            >
                              <OpenIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>

                      {/* Customer Details */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {order.customer_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {order.customer_phone}
                        </Typography>
                        {order.customer_address && (
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            noWrap
                            sx={{ maxWidth: 180, display: 'block' }}
                          >
                            {order.customer_address}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Product & Category */}
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} sx={{ maxWidth: 220 }}>
                          {order.product_name}
                        </Typography>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.4 }}>
                          <Chip
                            label={order.category_display || order.category}
                            size="small"
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              fontWeight: 700,
                              bgcolor: (t) =>
                                t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                              color: 'primary.main'
                            }}
                          />
                        </Stack>
                      </TableCell>

                      {/* Order Date */}
                      <TableCell>
                        <Typography variant="body2">
                          {order.order_date || (order.created_at ? order.created_at.split('T')[0] : '—')}
                        </Typography>
                        {order.estimated_delivery && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            Est: {order.estimated_delivery}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Pipeline Stage */}
                      <TableCell>
                        <Chip
                          label={stageInfo.label}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            bgcolor: `${stageInfo.color}20`,
                            color: stageInfo.color,
                            border: `1px solid ${stageInfo.color}50`
                          }}
                        />
                        {order.tracking_notes && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            noWrap
                            sx={{ maxWidth: 180, mt: 0.3 }}
                          >
                            {order.tracking_notes}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Total / Shipping */}
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={800}>
                          ৳ {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Item: ৳ {price.toLocaleString()} | Ship: ৳ {shipping.toLocaleString()}
                        </Typography>
                      </TableCell>

                      {/* Paid / Due */}
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={800} color="success.main">
                          Paid: ৳ {paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Typography>
                        {due > 0 ? (
                          <Chip
                            label={`Due: ৳ ${due.toLocaleString()}`}
                            size="small"
                            color="error"
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: '0.7rem', height: 20, mt: 0.3 }}
                          />
                        ) : (
                          <Chip
                            label="PAID"
                            size="small"
                            color="success"
                            sx={{ fontWeight: 800, fontSize: '0.7rem', height: 20, mt: 0.3 }}
                          />
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Update Status & Payments">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setSelectedOrder(order);
                                setUpdateDialogOpen(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Order">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => handleDeleteClick(order, e)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Dialogs */}
      {createDialogOpen && (
        <CreateOtherGoodsDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onOrderCreated={() => fetchOrders(false)}
        />
      )}

      {updateDialogOpen && selectedOrder && (
        <UpdateOrderTrackingDialog
          open={updateDialogOpen}
          onClose={() => {
            setUpdateDialogOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onOrderUpdated={() => fetchOrders(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Custom Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete order{' '}
            <strong>{orderToDelete?.order_id}</strong> ({orderToDelete?.product_name}) for customer{' '}
            <strong>{orderToDelete?.customer_name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
