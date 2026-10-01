import React, { useState, useEffect } from 'react';
import { useSmartPolling } from '../utils/useSmartPolling';
import {
  Box,
  Grid,
  Card,
  Typography,
  Button,
  Stack,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  CircularProgress,
  Divider,
  useTheme
} from '@mui/material';
import {
  NotificationsActive as NotificationsActiveIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
  AccessTime as AccessTimeIcon,
  PhoneAndroid as PhoneIcon,
  Info as InfoIcon,
  PointOfSale as SaleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { deviceApi, saleApi } from '../api/client';
import { apiCache } from '../utils/apiCache';
import StatusBadge from '../components/common/StatusBadge';
import VariantBadge from '../components/common/VariantBadge';
import CopyableText from '../components/common/CopyableText';
import DeviceDetailDrawer from '../dialogs/DeviceDetailDrawer';
import MarkSoldDialog from '../dialogs/MarkSoldDialog';
import { computeStaffAlerts, formatReadableDate } from '../utils/staffAlerts';

export default function StaffNotifications() {
  const theme = useTheme();
  const { user } = useAuth();

  const cachedDevices = apiCache.get('/api/devices/');
  const cachedSales = apiCache.get('/api/sales/');

  const [devices, setDevices] = useState(() => cachedDevices?.results || cachedDevices || []);
  const [sales, setSales] = useState(() => cachedSales?.results || cachedSales || []);
  const [loading, setLoading] = useState(() => !cachedDevices);

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [markSoldOpen, setMarkSoldOpen] = useState(false);
  const [markSoldDevice, setMarkSoldDevice] = useState(null);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [devsRes, salesRes] = await Promise.all([
        deviceApi.getAll(),
        saleApi.getAll()
      ]);
      const freshDevs = devsRes.data.results || devsRes.data || [];
      const freshSales = salesRes.data.results || salesRes.data || [];

      apiCache.set('/api/devices/', freshDevs);
      apiCache.set('/api/sales/', freshSales);

      setDevices(freshDevs);
      setSales(freshSales);
    } catch (e) {
      console.error('Failed to fetch notifications data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(Boolean(cachedDevices));
  }, []);

  // Live smart polling every 30s (pauses automatically when tab is minimized/hidden)
  useSmartPolling(() => {
    fetchData(true);
  }, 30000);

  const alerts = computeStaffAlerts(devices, sales, user);
  const {
    staleCustodyDevices,
    showInactivityAlert,
    inactivityDays,
    monthlyTarget,
    currentMonthSalesCount,
    remainingForTarget,
    targetProgress,
    daysLeftInMonth
  } = alerts;

  const isTargetAchieved = remainingForTarget === 0;

  return (
    <Box sx={{ pb: 6, maxWidth: 1200, mx: 'auto' }}>
      {/* 1. Sleek Minimal Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: -0.5 }}>
            Notifications & Alerts
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2 }}>
            Custody tracking and performance targets for <strong>@{user?.username}</strong>
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={() => fetchData(false)}
          disabled={loading}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            color: 'text.primary',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover', borderColor: 'text.secondary' }
          }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      <Stack spacing={2.5}>
        {/* 2. Key Metrics Row: Monthly Target & Sales Inactivity */}
        <Grid container spacing={2}>
          {/* Monthly Target */}
          <Grid item xs={12} md={showInactivityAlert ? 6 : 12}>
            <Card
              variant="outlined"
              sx={{
                p: 2.5,
                height: '100%',
                borderRadius: 2.5,
                bgcolor: 'background.paper',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrophyIcon sx={{ color: isTargetAchieved ? 'success.main' : 'text.secondary', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Monthly Target
                  </Typography>
                </Box>
                <Chip
                  label={`${currentMonthSalesCount} / ${monthlyTarget} Sold`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.72rem',
                    height: 24,
                    bgcolor: isTargetAchieved ? 'rgba(16, 185, 129, 0.1)' : 'action.selected',
                    color: isTargetAchieved ? 'success.main' : 'text.primary',
                    borderRadius: 1.5
                  }}
                />
              </Box>

              <Box sx={{ my: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={targetProgress * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
                    '& .MuiLinearProgress-bar': {
                      bgcolor: isTargetAchieved ? 'success.main' : 'primary.main',
                      borderRadius: 3
                    }
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {Math.round(targetProgress * 100)}% completed
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {daysLeftInMonth} day{daysLeftInMonth > 1 ? 's' : ''} left this month
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Sales Activity Alert */}
          {showInactivityAlert && (
            <Grid item xs={12} md={6}>
              <Card
                variant="outlined"
                sx={{
                  p: 2.5,
                  height: '100%',
                  borderRadius: 2.5,
                  bgcolor: 'background.paper',
                  borderColor: 'divider',
                  borderLeft: '4px solid #F59E0B',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Sales Activity Notice
                    </Typography>
                  </Box>
                  <Chip
                    label={`${inactivityDays}d Inactive`}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      height: 24,
                      bgcolor: 'rgba(245, 158, 11, 0.1)',
                      color: '#D97706',
                      borderRadius: 1.5
                    }}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem', mt: 0.5 }}>
                  No retail sales recorded in the last <strong>{inactivityDays} days</strong>. Post devices to social channels to drive conversions.
                </Typography>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* 3. Devices Held Over 7 Days */}
        <Box sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 0.5 }}>
            <AccessTimeIcon sx={{ color: staleCustodyDevices.length > 0 ? 'warning.main' : 'text.secondary', fontSize: 18 }} />
            <Typography
              variant="subtitle2"
              fontWeight={700}
              color="text.secondary"
              sx={{ letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.75rem' }}
            >
              Devices in Custody &gt; 7 Days ({staleCustodyDevices.length})
            </Typography>
          </Box>

          {staleCustodyDevices.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 2.5,
                bgcolor: 'background.paper',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <CheckCircleIcon sx={{ color: 'success.main', fontSize: 22 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                  All Custody Devices Fresh
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  None of your currently assigned devices have exceeded 7 days.
                </Typography>
              </Box>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {staleCustodyDevices.map(({ device, days, assignedDate }) => {
                const isOverTwoWeeks = days >= 14;
                const isPendingSale = device.current_status === 'PENDING_SALE';

                return (
                  <Grid item xs={12} sm={6} lg={4} key={device.id}>
                    <Card
                      variant="outlined"
                      onClick={() => {
                        setSelectedDevice(device);
                        setDrawerOpen(true);
                      }}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        cursor: 'pointer',
                        borderColor: isOverTwoWeeks ? 'rgba(239, 68, 68, 0.4)' : 'divider',
                        bgcolor: 'background.paper',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: isOverTwoWeeks ? 'error.main' : 'primary.main',
                          boxShadow: (theme) =>
                            theme.palette.mode === 'dark'
                              ? '0 4px 20px rgba(0,0,0,0.4)'
                              : '0 4px 16px rgba(0,0,0,0.06)'
                        }
                      }}
                    >
                      {/* Top Row: Model Name & Days Badge */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={700} noWrap>
                            {device.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {device.capacity || ''} {device.color ? `• ${device.color}` : ''}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${days}d held`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 22,
                            bgcolor: isOverTwoWeeks ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                            color: isOverTwoWeeks ? '#EF4444' : '#D97706',
                            borderRadius: 1.5
                          }}
                        />
                      </Box>

                      {/* Specs Badges */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mb: 1.2 }}>
                        <VariantBadge variant={device.variant} />
                        {device.battery_health && (
                          <Chip
                            label={`🔋 ${device.battery_health}%`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              bgcolor: 'action.selected',
                              color: 'text.secondary',
                              borderRadius: 1
                            }}
                          />
                        )}
                        <StatusBadge status={device.current_status} />
                      </Box>

                      {/* IMEI Container */}
                      <Box
                        sx={{
                          p: 0.8,
                          mb: 1.5,
                          borderRadius: 1.5,
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CopyableText text={device.imei} />
                      </Box>

                      {/* Bottom Row: Assigned Date & Mark Sold Action */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          pt: 0.5,
                          borderTop: '1px solid',
                          borderColor: 'divider'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem' }}>
                          Assigned: {formatReadableDate(assignedDate)}
                        </Typography>

                        <Box onClick={(e) => e.stopPropagation()}>
                          {isPendingSale ? (
                            <Chip
                              label="Pending Approval"
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                bgcolor: 'rgba(245, 158, 11, 0.1)',
                                color: '#D97706',
                                borderRadius: 1.5
                              }}
                            />
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<SaleIcon sx={{ fontSize: '13px !important' }} />}
                              onClick={() => {
                                setMarkSoldDevice(device);
                                setMarkSoldOpen(true);
                              }}
                              sx={{
                                py: 0.3,
                                px: 1,
                                fontWeight: 600,
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontSize: '0.72rem'
                              }}
                            >
                              Sell Device
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Stack>

      {/* Device Details Drawer */}
      <DeviceDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        device={selectedDevice}
        onDeviceUpdated={() => fetchData(false)}
        onOpenEdit={() => {}}
      />

      {/* Mark Sold Dialog */}
      <MarkSoldDialog
        open={markSoldOpen}
        onClose={() => {
          setMarkSoldOpen(false);
          setMarkSoldDevice(null);
        }}
        device={markSoldDevice}
        onSubmitted={() => fetchData(false)}
      />
    </Box>
  );
}
