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
    <Box sx={{ pb: 5 }}>
      {/* Top Header Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: { xs: 2, sm: 3 },
          borderRadius: 2.5,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
          <Box
            sx={{
              width: { xs: 40, sm: 46 },
              height: { xs: 40, sm: 46 },
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              flexShrink: 0
            }}
          >
            <NotificationsActiveIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ fontSize: { xs: '1.15rem', sm: '1.4rem' } }}>
              Notifications & Automated Alerts
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.78rem', sm: '0.85rem' } }}>
              Live custody age tracking, sales activity monitoring, and monthly targets for <strong>@{user?.username}</strong>
            </Typography>
          </Box>
        </Box>

        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => fetchData(false)}
          disabled={loading}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Paper>

      <Stack spacing={2.5}>
        {/* Rule 3: Monthly Sales Target Card */}
        <Card
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 2.5,
            bgcolor: 'background.paper',
            borderColor: isTargetAchieved ? 'rgba(16, 185, 129, 0.35)' : 'rgba(99, 102, 241, 0.25)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrophyIcon sx={{ color: '#F59E0B', fontSize: 22 }} />
              <Typography variant="subtitle1" fontWeight={800}>
                Monthly Sales Target
              </Typography>
            </Box>
            <Chip
              label={`${currentMonthSalesCount} / ${monthlyTarget} Sold`}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '0.75rem',
                height: 26,
                px: 0.5,
                bgcolor: isTargetAchieved ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                color: isTargetAchieved ? '#10B981' : '#6366F1',
                border: '1px solid',
                borderColor: isTargetAchieved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)',
                borderRadius: 1.5
              }}
            />
          </Box>

          {/* Progress Bar & Subtitle */}
          <Box sx={{ mb: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={targetProgress * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                '& .MuiLinearProgress-bar': {
                  bgcolor: isTargetAchieved ? '#10B981' : '#6366F1',
                  borderRadius: 4
                }
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.8 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {Math.round(targetProgress * 100)}% completed
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {daysLeftInMonth} day{daysLeftInMonth > 1 ? 's' : ''} left in month
              </Typography>
            </Box>
          </Box>

          {/* Target Update Suggestion Text */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: isTargetAchieved ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
              border: '1px solid',
              borderColor: isTargetAchieved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.2
            }}
          >
            {isTargetAchieved ? (
              <CheckCircleIcon sx={{ color: '#10B981', fontSize: 18 }} />
            ) : (
              <TrendingUpIcon sx={{ color: '#6366F1', fontSize: 18 }} />
            )}
            <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary', fontSize: '0.85rem' }}>
              {isTargetAchieved
                ? '🎉 Target Achieved: You reached your 15-devices monthly target!'
                : `Target Update: You are ${remainingForTarget} device${remainingForTarget > 1 ? 's' : ''} away from reaching your 15-devices monthly target.`}
            </Typography>
          </Box>
        </Card>

        {/* Rule 2: Sales Inactivity Alert (if 3+ days inactive) */}
        {showInactivityAlert && (
          <Card
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: 2.5,
              bgcolor: 'background.paper',
              borderColor: 'rgba(245, 158, 11, 0.35)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon sx={{ color: '#D97706', fontSize: 20 }} />
                <Typography variant="subtitle1" fontWeight={800}>
                  Sales Activity Alert
                </Typography>
              </Box>
              <Chip
                label={`${inactivityDays} Days Inactive`}
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  height: 24,
                  bgcolor: 'rgba(245, 158, 11, 0.12)',
                  color: '#D97706',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 1.5
                }}
              />
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.2
              }}
            >
              <SpeedIcon sx={{ color: '#D97706', fontSize: 18 }} />
              <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary', fontSize: '0.85rem' }}>
                No sales recorded in the last {inactivityDays} days. Time to close new sales!
              </Typography>
            </Box>
          </Card>
        )}

        {/* Rule 1: Devices Held Over 7 Days */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 0.5 }}>
            <AccessTimeIcon sx={{ color: staleCustodyDevices.length > 0 ? '#EF4444' : 'primary.main', fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.78rem' }}>
              DEVICES HELD OVER 7 DAYS ({staleCustodyDevices.length})
            </Typography>
          </Box>

          {staleCustodyDevices.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                bgcolor: 'rgba(16, 185, 129, 0.06)',
                borderColor: 'rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
              }}
            >
              <CheckCircleIcon sx={{ color: '#10B981', fontSize: 26 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight={800} color="text.primary">
                  All Custody Devices Are Fresh
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  None of your custody devices have exceeded 7 days.
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
                        borderColor: isOverTwoWeeks ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.3)',
                        bgcolor: 'background.paper',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          borderColor: isOverTwoWeeks ? '#EF4444' : '#F59E0B',
                          boxShadow: (theme) =>
                            theme.palette.mode === 'dark' ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.06)'
                        }
                      }}
                    >
                      {/* Top Row: Model Name & Days in Custody Chip */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.2 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={800} noWrap>
                            {device.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                            {device.capacity || ''} {device.color ? `• ${device.color}` : ''}
                          </Typography>
                        </Box>
                        <Chip
                          label={`⚠️ ${days} Days in Custody`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            height: 22,
                            bgcolor: isOverTwoWeeks ? 'rgba(239, 68, 68, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                            color: isOverTwoWeeks ? '#EF4444' : '#D97706',
                            border: '1px solid',
                            borderColor: isOverTwoWeeks ? 'rgba(239, 68, 68, 0.25)' : 'rgba(217, 119, 6, 0.25)',
                            borderRadius: 1.5
                          }}
                        />
                      </Box>

                      {/* Specs Row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mb: 1.2 }}>
                        <VariantBadge variant={device.variant} />
                        {device.battery_health && (
                          <Chip
                            label={`🔋 ${device.battery_health}%${device.battery_cycle ? ` (${device.battery_cycle})` : ''}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              bgcolor: device.battery_health >= 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                              color: device.battery_health >= 80 ? '#10B981' : '#EAB308',
                              border: '1px solid',
                              borderColor: device.battery_health >= 80 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(234, 179, 8, 0.25)',
                              borderRadius: 1
                            }}
                          />
                        )}
                        <StatusBadge status={device.current_status} />
                      </Box>

                      {/* Monospace IMEI Container */}
                      <Box
                        sx={{
                          p: 1,
                          mb: 1.2,
                          borderRadius: 1.5,
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CopyableText text={device.imei} />
                      </Box>

                      {/* Shortened Suggestion Box */}
                      <Box
                        sx={{
                          p: 1.2,
                          mb: 1.5,
                          borderRadius: 1.5,
                          bgcolor: isOverTwoWeeks ? 'rgba(239, 68, 68, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.8
                        }}
                      >
                        <InfoIcon sx={{ color: isOverTwoWeeks ? '#EF4444' : '#D97706', fontSize: 16 }} />
                        <Typography variant="caption" fontWeight={600} color="text.primary">
                          It has been in your custody for {days} days!
                        </Typography>
                      </Box>

                      {/* Bottom Row: Assigned Date + Action Button */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          pt: 0.5
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
                          Assigned: {formatReadableDate(assignedDate)}
                        </Typography>

                        <Box onClick={(e) => e.stopPropagation()}>
                          {isPendingSale ? (
                            <Chip
                              label="⏳ Pending Approval"
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                bgcolor: 'rgba(245, 158, 11, 0.12)',
                                color: '#D97706',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: 1.5
                              }}
                            />
                          ) : (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<SaleIcon sx={{ fontSize: '14px !important' }} />}
                              onClick={() => {
                                setMarkSoldDevice(device);
                                setMarkSoldOpen(true);
                              }}
                              sx={{
                                py: 0.5,
                                px: 1.2,
                                fontWeight: 700,
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontSize: '0.75rem'
                              }}
                            >
                              Mark Sold
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
