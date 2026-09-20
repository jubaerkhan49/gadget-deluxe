import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  useTheme,
  Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  ShoppingBag as OrderIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckIcon,
  RadioButtonChecked as CurrentStepIcon,
  RadioButtonUnchecked as PendingStepIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Phone as PhoneIcon,
  LocationOn as AddressIcon,
  CalendarToday as DateIcon,
  AttachMoney as MoneyIcon,
  Timeline as TimelineIcon,
  HelpOutline as HelpIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { otherGoodsApi } from '../api/client';

const STAGES = [
  { id: 'ORDER_CONFIRMED', title: 'Order Confirmed', desc: 'Order placed & recorded', step: 0 },
  { id: 'PAYMENT_RECEIVED', title: 'Payment Made', desc: 'Advance payment received', step: 1 },
  { id: 'PRODUCT_PURCHASED', title: 'Product Purchased', desc: 'Sourced from China store/supplier', step: 2 },
  { id: 'SHIPPED_TO_CN_WAREHOUSE', title: 'Shipped to CN Warehouse', desc: 'Domestic China logistics', step: 3 },
  { id: 'SHIPPED_TO_BD', title: 'Shipped to BD (In Transit)', desc: 'International air/sea freight to BD', step: 4 },
  { id: 'ARRIVED_AT_BD', title: 'Arrived at BD', desc: 'Customs clearance & BD entry', step: 5 },
  { id: 'RECEIVED_IN_BD', title: 'Received in BD', desc: 'Sorted at local hub & weight verified', step: 6 },
  { id: 'DELIVERED', title: 'Product Delivered', desc: 'Delivered to customer', step: 7 }
];

export default function PublicOrderTracking() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlQuery = searchParams.get('order') || searchParams.get('order_id') || searchParams.get('phone') || searchParams.get('q') || '';

  const [inputQuery, setInputQuery] = useState(urlQuery);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [multipleOrders, setMultipleOrders] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchTracking = async (q) => {
    if (!q || !q.trim()) return;
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await otherGoodsApi.trackPublic(q.trim());

      if (res.data?.found) {
        if (res.data.orders && res.data.orders.length > 1) {
          setMultipleOrders(res.data.orders);
          setOrder(res.data.order || res.data.orders[0]);
        } else {
          setMultipleOrders([]);
          setOrder(res.data.order || (res.data.orders ? res.data.orders[0] : null));
        }
      } else {
        setOrder(null);
        setMultipleOrders([]);
        setErrorMsg(res.data?.message || 'No tracking information found for this query.');
      }
    } catch (err) {
      console.error('Tracking fetch error:', err);
      setOrder(null);
      setMultipleOrders([]);
      setErrorMsg(
        err.response?.data?.message ||
        'Order not found. Please double-check your Order ID (e.g. OG-2026-XXXX) or Phone Number.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlQuery) {
      setInputQuery(urlQuery);
      fetchTracking(urlQuery);
    }
  }, [urlQuery]);

  const handleSearch = (e) => {
    e?.preventDefault();
    if (!inputQuery.trim()) {
      enqueueSnackbar('Please enter an Order ID or Phone number.', { variant: 'warning' });
      return;
    }
    setSearchParams({ order: inputQuery.trim() });
    fetchTracking(inputQuery.trim());
  };

  const handleCopyLink = () => {
    const trackingUrl = window.location.href;
    navigator.clipboard.writeText(trackingUrl);
    enqueueSnackbar('Tracking link copied to clipboard!', { variant: 'success' });
  };

  const currentStepIndex = order ? STAGES.findIndex((s) => s.id === order.stage) : -1;

  const numPrice = order ? parseFloat(order.product_price) || 0 : 0;
  const numShipping = order ? parseFloat(order.shipping_cost) || 0 : 0;
  const numPaid = order ? parseFloat(order.payment_amount) || 0 : 0;
  const totalAmount = order ? (parseFloat(order.total_amount) || (numPrice + numShipping)) : 0;
  const dueAmount = order ? (parseFloat(order.due_amount) || Math.max(0, totalAmount - numPaid)) : 0;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: (t) => (t.palette.mode === 'dark' ? '#0B0F17' : '#F8FAFC'),
        py: { xs: 3, md: 6 },
        px: { xs: 2, sm: 3 }
      }}
    >
      <Container maxWidth="md">
        {/* Brand Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              color: '#fff',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
              mb: 1.5
            }}
          >
            <ShippingIcon fontSize="large" />
          </Box>
          <Typography variant="h4" fontWeight={900} letterSpacing="-0.5px">
            Gadget Deluxe
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>
            Live Package & Order Tracking Portal
          </Typography>
        </Box>

        {/* Search Input Card */}
        <Paper
          elevation={0}
          component="form"
          onSubmit={handleSearch}
          sx={{
            p: 2,
            mb: 4,
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            background: (t) => (t.palette.mode === 'dark' ? '#131B2E' : '#fff'),
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            display: 'flex',
            gap: 1.5,
            flexWrap: { xs: 'wrap', sm: 'nowrap' }
          }}
        >
          <TextField
            fullWidth
            size="medium"
            placeholder="Enter Order ID (e.g. OG-2026-0001) or Phone Number..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1.5 }} />
            }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              minWidth: 140,
              borderRadius: 2.5,
              fontWeight: 700,
              px: 3,
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)'
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Track Order'}
          </Button>
        </Paper>

        {/* Error / Not Found Alert */}
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 2.5 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Multiple Orders Selector (if tracked by phone number) */}
        {multipleOrders.length > 1 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              border: 1,
              borderColor: 'primary.main',
              bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1 }}>
              Found {multipleOrders.length} orders associated with this search:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {multipleOrders.map((ord) => (
                <Chip
                  key={ord.order_id}
                  label={`${ord.order_id} • ${ord.product_name}`}
                  onClick={() => setOrder(ord)}
                  color={order?.order_id === ord.order_id ? 'primary' : 'default'}
                  variant={order?.order_id === ord.order_id ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700 }}
                />
              ))}
            </Box>
          </Paper>
        )}

        {/* Order Details Body */}
        {order && (
          <Box>
            {/* Header / Status Banner */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 3,
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                background: (t) => (t.palette.mode === 'dark' ? '#131B2E' : '#fff'),
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h5" fontWeight={900} color="primary.main">
                      {order.order_id}
                    </Typography>
                    <Chip
                      label={order.category_display || order.category}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 700 }}
                    />
                    <Chip
                      label={order.stage_display || order.stage}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)'),
                        color: 'success.main',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}
                    />
                  </Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
                    {order.product_name}
                  </Typography>
                  {order.product_description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {order.product_description}
                    </Typography>
                  )}
                </Box>

                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CopyIcon />}
                  onClick={handleCopyLink}
                  sx={{ borderRadius: 2, textTransform: 'none' }}
                >
                  Share Link
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    CUSTOMER NAME
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {order.customer_name}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    ORDER DATE
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {order.order_date || (order.created_at ? order.created_at.split('T')[0] : '—')}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    ESTIMATED DELIVERY
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={(order.estimated_delivery || order.estimated_delivery_date) ? 'primary.main' : 'text.secondary'}
                  >
                    {order.estimated_delivery || order.estimated_delivery_date || 'In Progress / Sourcing'}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
                    DELIVERY STATUS
                  </Typography>
                  {(order.stage === 'DELIVERED' || order.tracking_status === 'DELIVERED' || order.actual_delivery || order.actual_delivery_date) ? (
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      color="success.main"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                      <CheckIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                      Delivered: {order.actual_delivery || order.actual_delivery_date || 'Completed'}
                    </Typography>
                  ) : (
                    <Typography variant="body2" fontWeight={700} color="warning.main">
                      In Transit (Step {currentStepIndex + 1} of 8)
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>

            {/* Delivered Celebration Banner when Step 8 reached */}
            {(order.stage === 'DELIVERED' || order.tracking_status === 'DELIVERED') && (
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.08) 100%)',
                  border: '1.5px solid rgba(34, 197, 94, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.6)',
                    flexShrink: 0
                  }}
                >
                  <CheckIcon fontSize="medium" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" fontWeight={900} color="success.main">
                      🎉 Package Delivered Successfully!
                    </Typography>
                    {(order.actual_delivery || order.actual_delivery_date) && (
                      <Chip
                        label={`Delivered on ${order.actual_delivery || order.actual_delivery_date}`}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 800, fontSize: '0.72rem' }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                    Your package has been safely handed over. Thank you for shopping with Gadget Deluxe!
                  </Typography>
                </Box>
              </Paper>
            )}

            {/* 8-Stage Visual Progress Timeline */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 3,
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                background: (t) => (t.palette.mode === 'dark' ? '#131B2E' : '#fff'),
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
              }}
            >
              <Typography variant="h6" fontWeight={800} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon color="primary" /> Shipment & Sourcing Progress
              </Typography>

              {/* Vertical Step Timeline for High Clarity */}
              <Box sx={{ position: 'relative', pl: 2 }}>
                {STAGES.map((st, idx) => {
                  const isCompleted = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const isPending = idx > currentStepIndex;
                  const isLastStep = idx === STAGES.length - 1;

                  return (
                    <Box
                      key={st.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        position: 'relative',
                        pb: isLastStep ? 0 : 3.5
                      }}
                    >
                      {/* Vertical connecting line */}
                      {!isLastStep && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 17,
                            top: 36,
                            bottom: 0,
                            width: 2,
                            bgcolor: idx < currentStepIndex ? '#10B981' : (t) => (t.palette.mode === 'dark' ? '#1E293B' : '#E2E8F0')
                          }}
                        />
                      )}

                      {/* Step Marker */}
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2.5,
                          zIndex: 2,
                          flexShrink: 0,
                          bgcolor: isLastStep && (isCompleted || isCurrent)
                            ? '#22C55E'
                            : isCompleted
                            ? '#10B981'
                            : isCurrent
                            ? '#3B82F6'
                            : (t) => (t.palette.mode === 'dark' ? '#1E293B' : '#E2E8F0'),
                          color: isCompleted || isCurrent ? '#fff' : 'text.disabled',
                          boxShadow: isLastStep && (isCompleted || isCurrent)
                            ? '0 0 20px rgba(34, 197, 94, 0.8)'
                            : isCurrent
                            ? '0 0 16px rgba(59, 130, 246, 0.6)'
                            : 'none',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {isCompleted || (isLastStep && isCurrent) ? (
                          <CheckIcon fontSize="small" />
                        ) : isCurrent ? (
                          <CurrentStepIcon fontSize="small" />
                        ) : (
                          <Typography variant="caption" fontWeight={800}>
                            {idx + 1}
                          </Typography>
                        )}
                      </Box>

                      {/* Step Content */}
                      <Box
                        sx={{
                          pt: 0.5,
                          flex: 1,
                          ...(isLastStep && (isCompleted || isCurrent)
                            ? {
                                p: 1.5,
                                borderRadius: 2.5,
                                bgcolor: (t) =>
                                  t.palette.mode === 'dark'
                                    ? 'rgba(34, 197, 94, 0.12)'
                                    : 'rgba(34, 197, 94, 0.08)',
                                border: '1px solid rgba(34, 197, 94, 0.3)'
                              }
                            : {})
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight={isLastStep && (isCompleted || isCurrent) ? 900 : isCurrent ? 800 : isCompleted ? 700 : 500}
                            color={
                              isLastStep && (isCompleted || isCurrent)
                                ? 'success.main'
                                : isCurrent
                                ? 'primary.main'
                                : isCompleted
                                ? 'text.primary'
                                : 'text.disabled'
                            }
                          >
                            Step {idx + 1}: {st.title}
                          </Typography>
                          {isCurrent && !isLastStep && (
                            <Chip
                              label="CURRENT STAGE"
                              size="small"
                              color="primary"
                              sx={{ fontWeight: 800, fontSize: '0.65rem', height: 20 }}
                            />
                          )}
                          {isLastStep && (isCompleted || isCurrent) && (
                            <Chip
                              label="DELIVERED"
                              size="small"
                              color="success"
                              sx={{ fontWeight: 900, fontSize: '0.65rem', height: 20 }}
                            />
                          )}
                        </Box>
                        <Typography
                          variant="caption"
                          color={isPending ? 'text.disabled' : 'text.secondary'}
                          sx={{ display: 'block', mt: 0.2 }}
                        >
                          {isLastStep && (isCompleted || isCurrent) && (order.actual_delivery || order.actual_delivery_date)
                            ? `Package successfully received by customer on ${order.actual_delivery || order.actual_delivery_date}`
                            : st.desc}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>

              {/* Latest Tracking Note Banner if exists */}
              {order.tracking_notes && (
                <Paper
                  variant="outlined"
                  sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)'),
                    borderColor: 'primary.main'
                  }}
                >
                  <Typography variant="caption" color="primary" fontWeight={800} display="block">
                    LATEST UPDATE FROM STORE:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                    "{order.tracking_notes}"
                  </Typography>
                </Paper>
              )}
            </Paper>

            {/* Financial Summary Breakdown */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3.5 },
                mb: 3,
                borderRadius: 3,
                border: 1,
                borderColor: 'divider',
                background: (t) => (t.palette.mode === 'dark' ? '#131B2E' : '#fff'),
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
              }}
            >
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon color="primary" /> Payment & Billing Summary
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">
                      Item / Product Price
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      ৳ {numPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" color="text.secondary">
                      Shipping & Logistics Cost
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      ৳ {numShipping.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={800}>
                      Total Order Amount
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={900} color="primary.main">
                      ৳ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)')
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Payment Method:
                      </Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Chip
                          label={order.payment_method_display || order.payment_method || 'bKash'}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontWeight: 800, height: 22 }}
                        />
                        {order.transaction_id && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', mt: 0.3 }}>
                            Trx: {order.transaction_id}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Paid / Advance:
                      </Typography>
                      <Typography variant="h6" fontWeight={800} color="success.main">
                        ৳ {numPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Remaining Due:
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={900}
                        color={dueAmount > 0 ? 'error.main' : 'success.main'}
                      >
                        {dueAmount > 0
                          ? `৳ ${dueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : 'PAID IN FULL'}
                      </Typography>
                    </Box>

                    {dueAmount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        * Remaining balance is payable upon receiving the item in Bangladesh.
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </Paper>

            {/* Timeline Event History */}
            {order.timeline_events && order.timeline_events.length > 0 && (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 3.5 },
                  mb: 3,
                  borderRadius: 3,
                  border: 1,
                  borderColor: 'divider',
                  background: (t) => (t.palette.mode === 'dark' ? '#131B2E' : '#fff'),
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                }}
              >
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                  Activity & Tracking Log
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {order.timeline_events.map((evt, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.7)'),
                        borderLeft: '4px solid #3B82F6'
                      }}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {evt.stage_display || evt.stage}
                      </Typography>
                      {evt.note && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                          {evt.note}
                        </Typography>
                      )}
                      {evt.timestamp && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                          {new Date(evt.timestamp).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}

            {/* Customer Support Footer */}
            <Box sx={{ textAlign: 'center', mt: 4, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Need help with your order? Contact Gadget Deluxe Customer Support.
              </Typography>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
