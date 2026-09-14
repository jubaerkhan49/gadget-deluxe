import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Divider,
  LinearProgress,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingBag as InvestmentIcon,
  Build as RepairIcon,
  LocalShipping as ShippingIcon,
  EmojiEvents as TrophyIcon,
  Speed as SpeedIcon,
  CalendarMonth as CalendarIcon,
  Refresh as RefreshIcon,
  PhoneAndroid as PhoneIcon,
  CheckCircle as CheckCircleIcon,
  Percent as PercentIcon,
  Star as StarIcon,
  ReceiptLong as ReceiptIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  WorkspacePremium as MedalIcon,
  Leaderboard as LeaderboardIcon,
  Insights as InsightsIcon,
  AccountCircle as UserIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { analyticsApi } from '../api/client';
import { formatNumber, formatBDT } from '../utils/formatters';

export default function Analytics() {
  const { enqueueSnackbar } = useSnackbar();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedYear, selectedMonth]);

  const fetchAnalytics = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await analyticsApi.getStats({
        year: selectedYear,
        month: selectedMonth
      });

      setAnalyticsData(res.data || null);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      enqueueSnackbar('Failed to load analytics data', { variant: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleResetToCurrentMonth = () => {
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    setSelectedYear(curYear);
    setSelectedMonth(curMonth);
  };

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1);

  // Month list for dropdown
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const summary = analyticsData?.summary || {};
  const bestSeller = analyticsData?.best_seller;
  const sellers = analyticsData?.sellers_ranking || [];
  const topModels = analyticsData?.top_models || [];

  return (
    <Box sx={{ pb: 5 }}>
      {/* Header & Month Filter Controls */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 3
        }}
      >
        <div>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
              Business Analytics
            </Typography>
            <Chip
              label={analyticsData?.month_label || 'Current Month'}
              color="primary"
              size="small"
              sx={{ fontWeight: 700, borderRadius: '8px' }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Real-time monthly profit, seller speed & consistency rankings, investment, and logistics cost breakdown.
          </Typography>
        </div>

        {/* Timeframe Selectors & Quick Actions */}
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              sx={{ borderRadius: '10px', fontWeight: 600 }}
            >
              {months.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              sx={{ borderRadius: '10px', fontWeight: 600 }}
            >
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {!isCurrentMonth && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleResetToCurrentMonth}
              sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
            >
              This Month
            </Button>
          )}

          <Tooltip title="Refresh Analytics" arrow>
            <IconButton
              onClick={() => fetchAnalytics(true)}
              disabled={loading || refreshing}
              sx={{
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                borderRadius: '10px'
              }}
            >
              <RefreshIcon
                fontSize="small"
                sx={{
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={3.5}>
          {/* 1. PRIMARY FINANCIAL PILLARS (4 METRICS) */}
          <Grid container spacing={2.5}>
            {/* PILLAR 1: TOTAL PROFIT THIS MONTH */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card
                sx={{
                  borderRadius: 3,
                  border: 1,
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(34, 197, 94, 0.3)' : '#BBF7D0',
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(22, 163, 74, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.05)',
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} color="#16A34A">
                      Total Profit (This Month)
                    </Typography>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(22, 163, 74, 0.25)' : '#DCFCE7',
                        color: '#16A34A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <TrendingUpIcon fontSize="small" />
                    </Box>
                  </Box>

                  <Typography variant="h4" fontWeight={900} color="#16A34A" letterSpacing={-0.5}>
                    {formatBDT(summary.total_profit)}
                  </Typography>

                  <Divider sx={{ my: 1.5, opacity: 0.6 }} />

                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Net Profit (After Expenses):
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="text.primary">
                        {formatBDT(summary.net_profit)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Profit Margin:
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="#16A34A">
                        {summary.profit_margin || 0}%
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* PILLAR 2: TOTAL INVESTMENT THIS MONTH */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card
                sx={{
                  borderRadius: 3,
                  border: 1,
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.05)',
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      Total Investment (This Month)
                    </Typography>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.25)' : '#DBEAFE',
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <InvestmentIcon fontSize="small" />
                    </Box>
                  </Box>

                  <Typography variant="h4" fontWeight={900} color="primary.main" letterSpacing={-0.5}>
                    {formatBDT(summary.total_investment)}
                  </Typography>

                  <Divider sx={{ my: 1.5, opacity: 0.6 }} />

                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Devices Added (CN/BD):
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="text.primary">
                        {summary.total_devices_invested || 0} Units
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Avg Cost per Device:
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="primary.main">
                        {formatBDT(summary.avg_investment_per_device)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* PILLAR 3: REPAIR COST THIS MONTH */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card
                sx={{
                  borderRadius: 3,
                  border: 1,
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 88, 12, 0.3)' : '#FED7AA',
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(234, 88, 12, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)',
                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.05)',
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} color="#EA580C">
                      Repair Cost (This Month)
                    </Typography>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 88, 12, 0.25)' : '#FFEDD5',
                        color: '#EA580C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <RepairIcon fontSize="small" />
                    </Box>
                  </Box>

                  <Typography variant="h4" fontWeight={900} color="#EA580C" letterSpacing={-0.5}>
                    {formatBDT(summary.total_repair_cost)}
                  </Typography>

                  <Divider sx={{ my: 1.5, opacity: 0.6 }} />

                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Devices in Service:
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="text.primary">
                        {summary.repair_devices_count || 0} Devices
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Status:
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="#EA580C">
                        {summary.repairs_in_progress || 0} In Progress • {summary.repairs_completed || 0} Done
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* PILLAR 4: SHIPPING COSTS THIS MONTH */}
            <Grid item xs={12} sm={6} lg={3}>
              <Card
                sx={{
                  borderRadius: 3,
                  border: 1,
                  borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(168, 85, 247, 0.3)' : '#E9D5FF',
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'linear-gradient(135deg, #FAF5FF 0%, #FFFFFF 100%)',
                  boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.05)',
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" fontWeight={700} color="#9333EA">
                      Shipping Costs (This Month)
                    </Typography>
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(168, 85, 247, 0.25)' : '#F3E8FF',
                        color: '#9333EA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ShippingIcon fontSize="small" />
                    </Box>
                  </Box>

                  <Typography variant="h4" fontWeight={900} color="#9333EA" letterSpacing={-0.5}>
                    {formatBDT(summary.total_shipping_cost)}
                  </Typography>

                  <Divider sx={{ my: 1.5, opacity: 0.6 }} />

                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Shipment Batches:
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="text.primary">
                        {summary.shipment_batches_count || 0} Batches
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Inbound Shipped Devices:
                      </Typography>
                      <Typography variant="caption" fontWeight={700} color="#9333EA">
                        {summary.shipment_devices_count || 0} Units
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* 2. BEST SELLER SPOTLIGHT BANNER */}
          {bestSeller ? (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 3.5,
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(30, 41, 59, 0.85) 100%)'
                    : 'linear-gradient(135deg, #FEFCE8 0%, #EFF6FF 100%)',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(234, 179, 8, 0.4)' : '#FDE047',
                boxShadow: '0 10px 30px -5px rgba(234, 179, 8, 0.12)'
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={7}>
                  <Stack direction="row" spacing={2.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: { xs: 56, sm: 68 },
                        height: { xs: 56, sm: 68 },
                        bgcolor: '#EAB308',
                        color: '#FFFFFF',
                        fontWeight: 900,
                        fontSize: '1.5rem',
                        boxShadow: '0 6px 20px rgba(234, 179, 8, 0.4)'
                      }}
                    >
                      <TrophyIcon sx={{ fontSize: 36 }} />
                    </Avatar>

                    <div>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          icon={<MedalIcon sx={{ fontSize: '15px !important', color: '#EAB308 !important' }} />}
                          label="#1 Best Seller of the Month"
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: '#FEF08A',
                            color: '#854D0E',
                            borderRadius: '8px'
                          }}
                        />
                      </Stack>

                      <Typography variant="h5" fontWeight={900} letterSpacing={-0.5} sx={{ mt: 0.5 }}>
                        {bestSeller.display_name} ({bestSeller.username})
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Generated the highest profit this month with consistent sales velocity and fast inventory turnover.
                      </Typography>
                    </div>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={4}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          textAlign: 'center',
                          borderRadius: 2.5,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.25)' : '#FFFFFF',
                          border: 1,
                          borderColor: 'divider'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Profit
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={900} color="#16A34A">
                          {formatBDT(bestSeller.total_profit)}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={4}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          textAlign: 'center',
                          borderRadius: 2.5,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.25)' : '#FFFFFF',
                          border: 1,
                          borderColor: 'divider'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Units Sold
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={900} color="primary.main">
                          {bestSeller.units_sold} Phones
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={4}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          textAlign: 'center',
                          borderRadius: 2.5,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.25)' : '#FFFFFF',
                          border: 1,
                          borderColor: 'divider'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Avg Speed
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={900} color="#EA580C">
                          {bestSeller.avg_turnaround_days} Days
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          ) : (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <TrophyIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" fontWeight={700}>
                No Sales Recorded for {analyticsData?.month_label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                When sales are recorded during this month, salesperson rankings and performance metrics will appear here.
              </Typography>
            </Paper>
          )}

          {/* 3. SALES TEAM PERFORMANCE LEADERBOARD TABLE */}
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LeaderboardIcon fontSize="small" />
                </Box>
                <div>
                  <Typography variant="h6" fontWeight={800} letterSpacing={-0.3}>
                    Sales Team Leaderboard & Profit Ranking
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ranked by total profit generated, turnaround speed after assignment, and selling consistency.
                  </Typography>
                </div>
              </Stack>

              <Chip
                label={`${sellers.length} Active Salespeople`}
                size="small"
                sx={{ fontWeight: 700, borderRadius: '8px' }}
              />
            </Box>

            {sellers.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No salesperson activity found for this month.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Salesperson</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Units Sold</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Total Revenue</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Profit Generated</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Avg Turnaround Speed</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">Consistency</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sellers.map((s, index) => {
                      const isFirst = index === 0;
                      const isSecond = index === 1;
                      const isThird = index === 2;

                      return (
                        <TableRow
                          key={s.seller_id}
                          hover
                          sx={{
                            bgcolor: isFirst
                              ? (theme) => theme.palette.mode === 'dark' ? 'rgba(234, 179, 8, 0.08)' : 'rgba(254, 252, 232, 0.6)'
                              : undefined
                          }}
                        >
                          {/* Rank Badge */}
                          <TableCell>
                            {isFirst ? (
                              <Chip label="🥇 #1" size="small" sx={{ fontWeight: 900, bgcolor: '#FEF08A', color: '#854D0E', borderRadius: '6px' }} />
                            ) : isSecond ? (
                              <Chip label="🥈 #2" size="small" sx={{ fontWeight: 800, bgcolor: '#E2E8F0', color: '#334155', borderRadius: '6px' }} />
                            ) : isThird ? (
                              <Chip label="🥉 #3" size="small" sx={{ fontWeight: 800, bgcolor: '#FFEDD5', color: '#9A3412', borderRadius: '6px' }} />
                            ) : (
                              <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ pl: 1 }}>
                                #{s.profit_rank}
                              </Typography>
                            )}
                          </TableCell>

                          {/* Salesperson Name */}
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar sx={{ width: 32, height: 32, fontSize: '0.85rem', bgcolor: 'primary.main' }}>
                                {s.display_name.charAt(0).toUpperCase()}
                              </Avatar>
                              <div>
                                <Typography variant="body2" fontWeight={700}>
                                  {s.display_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  @{s.username}
                                </Typography>
                              </div>
                            </Stack>
                          </TableCell>

                          {/* Units Sold */}
                          <TableCell align="center">
                            <Chip
                              label={`${s.units_sold} Units`}
                              size="small"
                              sx={{ fontWeight: 700, borderRadius: '6px' }}
                            />
                          </TableCell>

                          {/* Total Revenue */}
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {formatBDT(s.total_revenue)}
                            </Typography>
                          </TableCell>

                          {/* Profit Generated */}
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={900} color="#16A34A">
                              {formatBDT(s.total_profit)}
                            </Typography>
                          </TableCell>

                          {/* Avg Turnaround Speed */}
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                              <SpeedIcon sx={{ fontSize: 16, color: '#EA580C' }} />
                              <Typography variant="body2" fontWeight={700}>
                                {s.avg_turnaround_days} d
                              </Typography>
                            </Stack>
                          </TableCell>

                          {/* Consistency */}
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={s.consistency_score}
                                sx={{ width: 60, height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="caption" fontWeight={700} color="text.secondary">
                                {s.active_sale_days} days
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* 4. TOP SELLING MODELS & BUSINESS VELOCITY */}
          <Grid container spacing={2.5}>
            {/* Top Selling Models */}
            <Grid item xs={12} md={7}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    Top Selling Device Models (This Month)
                  </Typography>
                  <Chip label="By Volume & Profit" size="small" sx={{ fontWeight: 700 }} />
                </Box>

                {topModels.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No sales data recorded for this period.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {topModels.map((m, idx) => (
                      <Paper
                        key={m.model}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                          border: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1.5
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Typography variant="body2" fontWeight={800} color="text.secondary" sx={{ width: 20 }}>
                            #{idx + 1}
                          </Typography>
                          <PhoneIcon fontSize="small" color="primary" />
                          <div>
                            <Typography variant="body2" fontWeight={700}>
                              {m.model}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Revenue: {formatBDT(m.total_revenue)}
                            </Typography>
                          </div>
                        </Stack>

                        <Stack direction="row" spacing={2} alignItems="center">
                          <Chip
                            label={`${m.units_sold} Sold`}
                            size="small"
                            sx={{ fontWeight: 700, borderRadius: '6px' }}
                          />
                          <Typography variant="body2" fontWeight={800} color="#16A34A">
                            {formatBDT(m.total_profit)}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* Business Velocity & Executive Summary Card */}
            <Grid item xs={12} md={5}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  height: '100%',
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)'
                      : 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)'
                }}
              >
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                  Executive Business Overview
                </Typography>

                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Revenue (Sales):</Typography>
                    <Typography variant="body1" fontWeight={800} color="text.primary">
                      {formatBDT(summary.total_revenue)}
                    </Typography>
                  </Box>
                  <Divider />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Net Return on Investment (ROI):</Typography>
                    <Typography variant="body1" fontWeight={800} color="#16A34A">
                      {summary.roi_percentage || 0}%
                    </Typography>
                  </Box>
                  <Divider />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Sales Count:</Typography>
                    <Typography variant="body1" fontWeight={800} color="text.primary">
                      {summary.total_sales_count || 0} Transactions
                    </Typography>
                  </Box>
                  <Divider />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Total Inbound Shipments Received:</Typography>
                    <Typography variant="body1" fontWeight={800} color="primary.main">
                      {summary.shipment_batches_count || 0} Batches ({summary.shipment_devices_count || 0} devices)
                    </Typography>
                  </Box>
                  <Divider />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Repair & Servicing Expenses:</Typography>
                    <Typography variant="body1" fontWeight={800} color="#EA580C">
                      {formatBDT(summary.total_repair_cost)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      )}
    </Box>
  );
}
